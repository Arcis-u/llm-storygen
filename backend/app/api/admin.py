"""
Admin API Router.
Protected endpoints for system administration. Requires admin role.
"""

from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_mongo_db
from app.core.security import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(require_admin)):
    """
    Returns system-wide statistics:
    - Total users, stories, chapters
    - Recent stories list
    """
    db = await get_mongo_db()

    total_users = await db.users.count_documents({})
    total_stories = await db.stories.count_documents({})
    total_chapters = await db.chapters.count_documents({})

    # Recent 10 stories with user info
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$limit": 10},
        {"$project": {
            "_id": 0,
            "story_id": 1,
            "title": 1,
            "genre": 1,
            "user_id": 1,
            "current_chapter": 1,
            "is_ended": 1,
            "created_at": 1,
        }}
    ]
    recent_stories = await db.stories.aggregate(pipeline).to_list(10)

    # Stringify dates for JSON
    for s in recent_stories:
        if "created_at" in s:
            s["created_at"] = str(s["created_at"])

    return {
        "total_users": total_users,
        "total_stories": total_stories,
        "total_chapters": total_chapters,
        "recent_stories": recent_stories,
    }


@router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    """List all users (admin only)."""
    db = await get_mongo_db()
    users = await db.users.find(
        {},
        {"_id": 0, "user_id": 1, "username": 1, "role": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(100)

    for u in users:
        if "created_at" in u:
            u["created_at"] = str(u["created_at"])
    return {"users": users}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    """Delete a user and all their stories (admin only)."""
    db = await get_mongo_db()

    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin account")

    # Delete all user's stories and chapters
    user_stories = await db.stories.find({"user_id": user_id}, {"story_id": 1}).to_list(None)
    story_ids = [s["story_id"] for s in user_stories]
    if story_ids:
        await db.chapters.delete_many({"story_id": {"$in": story_ids}})
        await db.stories.delete_many({"user_id": user_id})

    await db.users.delete_one({"user_id": user_id})
    return {"deleted": True, "stories_removed": len(story_ids)}
