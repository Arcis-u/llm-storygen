"""Shared ownership and cross-worker mutation guard for story routes."""
import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from functools import wraps

from fastapi import Depends, HTTPException, Request
from app.core.database import get_mongo_db
from app.core.security import get_current_user


async def require_story_access(request: Request, user: dict = Depends(get_current_user)):
    story_id = request.path_params.get("story_id")
    if not story_id and request.method in {"POST", "PUT", "PATCH"}:
        try:
            body = await request.json()
            story_id = body.get("story_id") if isinstance(body, dict) else None
        except (ValueError, json.JSONDecodeError):
            pass  # Pydantic returns the normal request validation error.
    if story_id:
        db = await get_mongo_db()
        story = await db.stories.find_one({"story_id": story_id, "user_id": user["user_id"]})
        if not story:
            raise HTTPException(404, "Không tìm thấy câu chuyện của bạn.")
    return user


@asynccontextmanager
async def story_mutation(story_id: str):
    # Longer than the bounded 10-minute generation; abandoned leases expire.
    db = await get_mongo_db()
    token = str(uuid.uuid4())
    now = datetime.utcnow()
    result = await db.stories.update_one(
        {"story_id": story_id, "$or": [{"mutation_until": {"$exists": False}}, {"mutation_until": {"$lte": now}}]},
        {"$set": {"mutation_token": token, "mutation_until": now + timedelta(minutes=12)}},
    )
    if result.matched_count != 1:
        raise HTTPException(409, "Câu chuyện đang xử lý một hành động khác. Hãy chờ rồi tải lại.")
    try:
        async with asyncio.timeout(600):
            yield
    finally:
        await asyncio.shield(db.stories.update_one(
            {"story_id": story_id, "mutation_token": token},
            {"$unset": {"mutation_token": "", "mutation_until": ""}},
        ))


def exclusive_story_mutation(fn):
    @wraps(fn)
    async def guarded(*args, **kwargs):
        story_id = kwargs.get("story_id") or kwargs["request"].story_id
        async with story_mutation(story_id):
            return await fn(*args, **kwargs)
    return guarded
