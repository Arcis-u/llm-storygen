"""
Database connection module.
Provides async MongoDB client and Qdrant client with connection lifecycle management.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from app.core.config import get_settings

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
        _qdrant_client = QdrantClient(url=settings.qdrant_url)
    return _qdrant_client


async def init_databases() -> None:
    """
    Initialize database connections and ensure required collections/indexes exist.
    Called once during application startup.
    """
    settings = get_settings()

    # --- MongoDB: Create indexes for fast queries ---
    db = await get_mongo_db()
    await db.stories.create_index("user_id")
    await db.stories.create_index("created_at")
    await db.chapters.create_index([("story_id", 1), ("chapter_number", 1)])

    # --- Qdrant: Ensure vector collection exists ---
    qdrant = get_qdrant()
    collections = qdrant.get_collections().collections
    collection_names = [c.name for c in collections]

    # Determine vector size based on model
    from app.services.embedding import get_embedding_dimension
    vector_size = get_embedding_dimension()

    if settings.qdrant_collection_name not in collection_names:
        qdrant.create_collection(
            collection_name=settings.qdrant_collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )
        print(f"[DB] Created Qdrant collection: {settings.qdrant_collection_name} (dim={vector_size})")
    else:
        # Check if existing collection has the right dimension
        try:
            info = qdrant.get_collection(settings.qdrant_collection_name)
            existing_size = info.config.params.vectors.size
            if existing_size != vector_size:
                print(f"[DB] Qdrant dimension mismatch: existing={existing_size}, expected={vector_size}. Recreating...")
                qdrant.delete_collection(settings.qdrant_collection_name)
                qdrant.create_collection(
                    collection_name=settings.qdrant_collection_name,
                    vectors_config=VectorParams(
                        size=vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                print(f"[DB] Recreated Qdrant collection with dim={vector_size}")
        except Exception as e:
            print(f"[DB] Could not verify Qdrant collection: {e}")


async def close_databases() -> None:
    """Gracefully close all database connections."""
    global _mongo_client, _qdrant_client
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
    if _qdrant_client:
        _qdrant_client.close()
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
    
    # Qdrant library uses synchronous calls for point insertion by default,
    # but we wrap it in an async function for API compatibility.
    qdrant.upsert(
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

