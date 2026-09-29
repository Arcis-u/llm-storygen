"""SSE transports parsed writer prose and public progress, never raw agent tokens."""
import asyncio
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.encoders import jsonable_encoder
from fastapi.responses import StreamingResponse
from app.core.database import get_mongo_db
from app.core.story_access import require_story_access, story_mutation
from app.core.turn_rules import prepare_action, initial_turn_state
from app.core.turn_service import persist_turn, index_chapter
from app.models.schemas import PlayerActionRequest
from app.graph.workflow import story_pipeline

router = APIRouter(dependencies=[Depends(require_story_access)])
logger = logging.getLogger(__name__)


def sse(kind, **data):
    return f"data: {json.dumps(jsonable_encoder(dict(type=kind, **data)), ensure_ascii=False)}\n\n"


@router.post("/stream-turn")
async def stream_story_turn(request: PlayerActionRequest, background_tasks: BackgroundTasks):
    db = await get_mongo_db()

    async def events():
        try:
            async with story_mutation(request.story_id):
                story = await db.stories.find_one({"story_id": request.story_id})
                previous = await db.chapters.find_one({"story_id": request.story_id, "chapter_number": story.get("current_chapter", 0)})
                if not previous:
                    raise HTTPException(409, "Hãy tạo chương mở đầu trước.")
                action, context, decision = prepare_action(request, story, previous)
                state = initial_turn_state(story, action, context, previous)
                final = None
                labels = {"memory_retrieval": "Đang nhớ lại hành trình…", "director": "Thế giới đang phản hồi lựa chọn…", "writer": "Đang viết chương tiếp theo…", "critic": "Đang kiểm tra tính nhất quán…", "state_extractor": "Đang cập nhật hệ quả…", "gamemaster": "Đang mở ra những ngã rẽ…"}
                yield sse("status", message="Đã tiếp nhận hành động của bạn…")
                if decision.get("dice_result"):
                    yield sse("roll", value=decision["dice_result"])
                async for event in story_pipeline.astream_events(state, version="v2"):
                    kind, name = event["event"], event["name"]
                    if kind == "on_chain_start" and name in labels:
                        yield sse("status", message=labels[name])
                    if kind == "on_chain_end" and name == "writer":
                        output = event.get("data", {}).get("output", {})
                        if isinstance(output, dict) and output.get("chapter_content"):
                            # Structured WriterOutput is parsed first; a revision replaces
                            # the draft instead of appending a second copy.
                            yield sse("replace", text=output["chapter_content"])
                    if kind == "on_chain_end" and name == "LangGraph":
                        final = event.get("data", {}).get("output")
                if not final:
                    raise HTTPException(502, "Chương truyện chưa hoàn tất. Hãy thử lại.")
                chapter, config = await persist_turn(action, story, final, decision)
                background_tasks.add_task(index_chapter, chapter)
            # Lease released before the client can submit its next choice.
            yield sse("done", chapter=chapter.model_dump(), config=config.model_dump())
        except asyncio.CancelledError:
            raise
        except HTTPException as exc:
            yield sse("error", message=exc.detail)
        except Exception:
            logger.exception("Turn failed for story %s", request.story_id)
            yield sse("error", message="Không thể hoàn tất lượt chơi. Tải lại để kiểm tra chương đã lưu trước khi thử tiếp.")

    return StreamingResponse(events(), media_type="text/event-stream", background=background_tasks,
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
