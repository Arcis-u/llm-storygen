"""Retrieve recent context plus bounded long-term memories without blocking the event loop."""
import asyncio
import logging
from app.graph.state import GraphState
from app.core.database import get_qdrant
from app.services.embedding import get_text_embedding
from app.core.config import get_settings

logger = logging.getLogger(__name__)

async def memory_retrieval_node(state: GraphState) -> GraphState:
    recent = state.get('relevant_memories', [])
    story_id = state.get('player_action', {}).get('story_id')
    try:
        async with asyncio.timeout(8):
            vector = await get_text_embedding(state.get('action_context', 'The player takes an action.'))
            hits = await asyncio.to_thread(
                get_qdrant().search,
                collection_name=get_settings().qdrant_collection_name,
                query_vector=vector, limit=5,
                query_filter={'must':[{'key':'story_id','match':{'value':story_id}}]},
            )
            recalled = [hit.payload.get('text', '') for hit in hits if hit.score > .3 and hit.payload]
            state['relevant_memories'] = list(dict.fromkeys(recent + recalled))
    except Exception:
        logger.warning('Long-term memory unavailable; keeping recent chapter context for %s', story_id)
        state['relevant_memories'] = recent
    return state
