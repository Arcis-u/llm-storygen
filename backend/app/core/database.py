"""
Database connection module.
Provides async MongoDB client and Qdrant client with connection lifecycle management.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from app.core.config import get_settings
from pymongo.errors import PyMongoError
import asyncio

# --- Module-level singletons ---
_mongo_client: AsyncIOMotorClient | None = None
_qdrant_client: QdrantClient | None = None


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """Returns the MongoDB database instance. Creates client on first call."""
    global _mongo_client
    settings = get_settings()
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(
            settings.mongodb_url,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
    return _mongo_client[settings.mongodb_db_name]


def get_qdrant() -> QdrantClient:
    """Returns the Qdrant client instance. Creates client on first call."""
    global _qdrant_client
    settings = get_settings()
    if _qdrant_client is None:
        kwargs = {"url": settings.qdrant_url, "timeout": 5}
        if settings.qdrant_api_key:
            kwargs["api_key"] = settings.qdrant_api_key
        _qdrant_client = QdrantClient(**kwargs)
    return _qdrant_client


async def init_databases() -> None:
    """
    Initialize database connections and ensure required collections/indexes exist.
    Called once during application startup.
    """
    settings = get_settings()

    # --- MongoDB: Create indexes for fast queries ---
    db = await get_mongo_db()
    try:
        await db.command("ping")
    except PyMongoError:
        raise RuntimeError(
            "MongoDB is unavailable. For local development, open Docker Desktop and run "
            "'docker compose up -d mongodb qdrant' from the project root, then restart the backend. "
            "For a remote database, check MONGODB_URL in backend/.env."
        ) from None
    await db.stories.create_index("user_id")
    await db.stories.create_index("story_id")
    await db.stories.create_index("created_at")
    await db.chapters.create_index([("story_id", 1), ("chapter_number", 1)])
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("username", unique=True)

    # --- Qdrant: Ensure vector collection exists ---
    qdrant = get_qdrant()
    try:
        collections = (await asyncio.to_thread(qdrant.get_collections)).collections
    except Exception:
        raise RuntimeError(
            "Qdrant is unavailable. Start it with 'docker compose up -d qdrant' "
            "or check QDRANT_URL in backend/.env."
        ) from None
    collection_names = [c.name for c in collections]

    # Determine vector size based on model
    from app.services.embedding import get_embedding_dimension
    vector_size = get_embedding_dimension()

    if settings.qdrant_collection_name not in collection_names:
        await asyncio.to_thread(qdrant.create_collection,
            collection_name=settings.qdrant_collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )
        print(f"[DB] Created Qdrant collection: {settings.qdrant_collection_name} (dim={vector_size})")
    else:
        # Never silently delete all story memories when an embedding model changes.
        info = await asyncio.to_thread(qdrant.get_collection, settings.qdrant_collection_name)
        existing_size = getattr(info.config.params.vectors, "size", None)
        if existing_size != vector_size:
            raise RuntimeError(
                f"Qdrant vector size mismatch: stored={existing_size}, expected={vector_size}. "
                "Existing memories were preserved. Restore the previous EMBEDDING_MODEL or "
                "choose a new QDRANT_COLLECTION_NAME and explicitly rebuild its memories."
            )

    # Ensure payload index exists for story_id filtering
    try:
        from qdrant_client.models import PayloadSchemaType
        await asyncio.to_thread(qdrant.create_payload_index,
            collection_name=settings.qdrant_collection_name,
            field_name="story_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print(f"[DB] Verified Qdrant payload index for 'story_id'")
    except Exception as e:
        # Ignore if it already exists, qdrant-client might throw if it exists in some versions, or just log
        pass


async def close_databases() -> None:
    """Gracefully close all database connections."""
    global _mongo_client, _qdrant_client
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
    if _qdrant_client:
        await asyncio.to_thread(_qdrant_client.close)
        _qdrant_client = None
    print("[DB] All database connections closed.")


async def save_story_memory(
    story_id: str, 
    chapter_number: int, 
    text_content: str, 
    embedding_vector: list[float],
    involved_organizations: list[str] = None,
    involved_npcs: list[str] = None
) -> None:
    """
    Saves a chunk of story memory into Qdrant Vector DB along with rich metadata.
    This allows the AI to recall specific interactions with organizations or NPCs.
    """
    settings = get_settings()
    qdrant = get_qdrant()
    
    import uuid
    point_id = str(uuid.uuid4())
    
    payload = {
        "story_id": story_id,
        "chapter_number": chapter_number,
        "text": text_content,
        "organizations": involved_organizations or [],
        "npcs": involved_npcs or []
    }
    
    await asyncio.to_thread(qdrant.upsert,
        collection_name=settings.qdrant_collection_name,
        points=[
            {
                "id": point_id,
                "vector": embedding_vector,
                "payload": payload
            }
        ]
    )
    print(f"[DB] Saved memory chunk for story {story_id}, chapter {chapter_number}")


async def save_chapter_memories(chapter, entries: list[dict], vectors: list[list[float]], collection_name: str | None = None) -> None:
    """Upsert this chapter's summary and passages with repeatable IDs."""
    from app.services.embedding import get_embedding_dimension
    from app.services.story_memory import memory_point_id
    if len(entries) != len(vectors):
        raise ValueError("Memory entry and vector counts differ")
    if not entries:
        return
    settings = get_settings()
    points = []
    for entry, vector in zip(entries, vectors):
        if len(vector) != get_embedding_dimension():
            raise ValueError("Memory vector dimension does not match configuration")
        points.append(PointStruct(
            id=memory_point_id(chapter.story_id, chapter.chapter_number, entry["kind"], entry["index"]),
            vector=vector,
            payload={
                "story_id": chapter.story_id,
                "chapter_number": chapter.chapter_number,
                "text": entry["text"],
                "memory_kind": entry["kind"],
                "chunk_index": entry["index"],
                "embedding_model": settings.embedding_model,
                "embedding_dimensions": get_embedding_dimension(),
            },
        ))
    await asyncio.to_thread(get_qdrant().upsert,
                           collection_name=collection_name or settings.qdrant_collection_name,
                           points=points, wait=True)

