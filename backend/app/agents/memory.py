"""
Node 1: Memory Retrieval.
Searches Qdrant Vector DB for memories relevant to the player's action.
"""

from app.graph.state import GraphState
from app.core.database import get_qdrant
from app.services.embedding import get_text_embedding
from app.core.config import get_settings

async def memory_retrieval_node(state: GraphState) -> GraphState:
    print("--- NODE 1: MEMORY RETRIEVAL ---")
    
    action = state["player_action"]
    story_id = action.get("story_id")
    
    # 1. Build Query Text
    query_text = ""
    action_type = action.get("action_type")
    
    if action_type == "custom":
        query_text = action.get("custom_action", "")
    elif action_type == "choice":
        query_text = f"Player chose option {action.get('choice_id')}"
        # In a real app, we'd look up the exact choice text from the previous state
    elif action_type == "buy_item":
        query_text = f"Player bought item {action.get('item_id')}"
    elif action_type == "join_faction":
        query_text = f"Player interacted with organization {action.get('org_id')}"
    else:
        query_text = "Continuing the story."
        
    print(f"[MEMORY] Query text: {query_text}")
    
    # 2. Get Embedding
    query_vector = await get_text_embedding(query_text)
    
    # 3. Search Qdrant
    settings = get_settings()
    qdrant = get_qdrant()
    
    try:
        # Check if collection exists first (might be empty on turn 1)
        collections = [c.name for c in qdrant.get_collections().collections]
        if settings.qdrant_collection_name not in collections:
            state["relevant_memories"] = []
            return state
            
        search_results = qdrant.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=query_vector,
            limit=5,
            # We filter by story_id to only get memories from THIS story
            query_filter={
                "must": [
                    {
                        "key": "story_id",
                        "match": {"value": story_id}
                    }
                ]
            }
        )
        
        memories = [hit.payload.get("text", "") for hit in search_results if hit.score > 0.3]
        state["relevant_memories"] = memories
        print(f"[MEMORY] Retrieved {len(memories)} relevant past memories.")
        
    except Exception as e:
        print(f"[MEMORY ERROR] Failed to search Qdrant: {e}")
        state["relevant_memories"] = []
        
    return state
