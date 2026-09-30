"""Rebuild a separate Qdrant collection from MongoDB; never delete the source.

From backend: python scripts/rebuild_story_memory.py --target NEW_COLLECTION
Add --apply after reviewing the dry-run. Switch QDRANT_COLLECTION_NAME only
after completion. Model, dimensions and endpoint can be overridden for staging.
"""
import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import get_settings
from app.core.database import get_mongo_db, get_qdrant, save_chapter_memories, close_databases
from app.services.embedding import get_text_embeddings, get_embedding_dimension
from app.services.story_memory import chapter_memories
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType


async def rebuild(target: str, apply: bool = False) -> dict:
    settings = get_settings()
    if target == settings.qdrant_collection_name:
        raise ValueError("Use a separate target collection; the active collection must be preserved")
    dimension = get_embedding_dimension()
    started = time.perf_counter()
    db = await get_mongo_db()
    qdrant = get_qdrant()
    names = {item.name for item in (await asyncio.to_thread(qdrant.get_collections)).collections}
    if target in names:
        info = await asyncio.to_thread(qdrant.get_collection, target)
        if getattr(info.config.params.vectors, "size", None) != dimension:
            raise ValueError("Target collection dimension does not match the requested profile")
        samples, _ = await asyncio.to_thread(qdrant.scroll, target, limit=1, with_payload=True)
        if samples and (samples[0].payload.get("embedding_model") != settings.embedding_model
                        or samples[0].payload.get("embedding_dimensions") != dimension):
            raise ValueError("Target collection contains a different embedding profile")
    chapters = 0
    points = 0
    cursor = db.chapters.find({"content": {"$type": "string", "$ne": ""}},
                              {"story_id": 1, "chapter_number": 1, "summary": 1, "content": 1})
    async for record in cursor:
        chapter = SimpleNamespace(story_id=record["story_id"], chapter_number=record["chapter_number"],
                                  summary=record.get("summary") or "", content=record["content"])
        entries = chapter_memories(chapter)
        if not entries:
            continue
        if apply:
            if target not in names:
                await asyncio.to_thread(qdrant.create_collection, target,
                                        vectors_config=VectorParams(size=dimension, distance=Distance.COSINE))
                await asyncio.to_thread(qdrant.create_payload_index, target, "story_id",
                                        field_schema=PayloadSchemaType.KEYWORD, wait=True)
                names.add(target)
            vectors = await get_text_embeddings([entry["text"] for entry in entries])
            await save_chapter_memories(chapter, entries, vectors, collection_name=target)
        chapters += 1
        points += len(entries)
        if apply and chapters % 10 == 0:
            print(json.dumps({"progress_chapters": chapters, "indexed_points": points}), flush=True)
    # An empty database still needs a ready collection before switching configuration.
    if apply and target not in names:
        await asyncio.to_thread(qdrant.create_collection, target,
                                vectors_config=VectorParams(size=dimension, distance=Distance.COSINE))
        await asyncio.to_thread(qdrant.create_payload_index, target, "story_id",
                                field_schema=PayloadSchemaType.KEYWORD, wait=True)
    report = {"applied": apply, "target": target, "model": settings.embedding_model,
              "dimensions": dimension, "chapters": chapters, "expected_points": points}
    if apply:
        actual = (await asyncio.to_thread(qdrant.count, target, exact=True)).count
        report["actual_points"] = actual
        if actual != points:
            raise ValueError("Target point count differs from MongoDB; do not switch collections")
        if await db.chapters.count_documents({"content": {"$type": "string", "$ne": ""}}) != chapters:
            raise ValueError("MongoDB chapters changed during migration; rerun before switching")
    report["elapsed_seconds"] = round(time.perf_counter() - started, 2)
    return report


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dimensions", type=int)
    parser.add_argument("--base-url")
    args = parser.parse_args()
    settings = get_settings()
    if args.dimensions:
        settings.embedding_dimensions = args.dimensions
    if args.base_url:
        settings.alibaba_base_url = args.base_url
    try:
        print(json.dumps(await rebuild(args.target, args.apply), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"completed": False, "error_type": type(error).__name__,
                          "http_status": getattr(error, "status_code", None),
                          "error_code": getattr(error, "code", None)}))
        raise SystemExit(1) from None
    finally:
        await close_databases()


if __name__ == "__main__":
    asyncio.run(main())
