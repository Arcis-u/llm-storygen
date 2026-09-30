"""Shared turn persistence. All callers hold the story mutation lease."""
import asyncio
import logging
from fastapi import HTTPException
from app.core.database import get_mongo_db, save_chapter_memories
from app.core.state_merger import apply_state_changes
from app.models.schemas import ChapterContent, StoryChoice

logger = logging.getLogger(__name__)


async def persist_turn(request, story, final_state, decision):
    if final_state.get("error") or not final_state.get("chapter_content", "").strip():
        raise HTTPException(502, "Không thể hoàn tất chương này. Hãy thử lại.")
    number = story.get("current_chapter", 0) + 1
    changes = dict(final_state.get("state_changes") or {})
    if request.action_type == "move":
        changes["current_location_id"] = request.target_location_id or request.custom_action
    if final_state.get("is_game_over"):
        changes["is_game_over"] = True
    chapter = ChapterContent(
        story_id=request.story_id, chapter_number=number,
        chapter_title=final_state.get("chapter_title") or f"Chương {number}",
        content=final_state["chapter_content"], summary=final_state.get("chapter_summary", ""),
        tone=final_state.get("tone", "ambient"), decision=decision, state_changes=changes,
        choices=[StoryChoice(**c) for c in (final_state.get("choices") or [])],
    )
    db = await get_mongo_db()
    # Upsert prevents duplicate chapter rows if a previous persistence attempt stopped
    # before advancing the story. Cross-collection crash atomicity needs a replica set.
    await db.chapters.replace_one({"story_id": request.story_id, "chapter_number": number}, chapter.model_dump(), upsert=True)
    merged = await apply_state_changes(request.story_id, changes, number)
    config = merged["config"]
    if config.is_ended:
        chapter.choices = []
        await db.chapters.update_one({"story_id": request.story_id, "chapter_number": number}, {"$set": {"choices": []}})
    return chapter, config


async def index_chapter(chapter):
    try:
        from app.services.embedding import get_text_embeddings
        from app.services.story_memory import chapter_memories
        async with asyncio.timeout(20):
            entries = chapter_memories(chapter)
            vectors = await get_text_embeddings([entry["text"] for entry in entries])
            await save_chapter_memories(chapter, entries, vectors)
    except Exception:
        logger.warning("Memory indexing failed for chapter %s", chapter.chapter_number, exc_info=True)
