"""
Story API Router (v2 — Production-Grade).
Handles: creation (with World Builder), customization, gameplay turns (with API Lock,
pre-processing logic for buy/move/join, State Merger integration), and state retrieval.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid
import asyncio

from app.core.database import get_mongo_db, save_story_memory
from app.services.embedding import get_text_embedding
from app.graph.workflow import story_pipeline
from app.core.state_merger import apply_state_changes
from app.models.schemas import (
    CreateStoryRequest,
    CustomizeStoryRequest,
    PlayerActionRequest,
    StoryConfig,
    CharacterState,
    CharacterPsychology,
    CharacterEconomy,
    ChapterContent,
    StoryChoice,
    SearchFactionRequest,
    Organization,
)

router = APIRouter(prefix="/api/story", tags=["story"])

# ─── In-memory lock set to prevent concurrent turns on same story ───
_active_locks: set[str] = set()


# ============================================================
# POST /create — World Builder
# ============================================================
@router.post("/create")
async def create_story(request: CreateStoryRequest):
    """
    Phase 1: Create a new story from the user's initial prompt.
    In Phase 5, the World Builder Agent will auto-generate locations, factions, and shop items.
    For now, we create a rich default world structure based on genre.
    """
    db = await get_mongo_db()
    story_id = str(uuid.uuid4())

    # Build initial story config with sensible defaults
    story_config = StoryConfig(
        story_id=story_id,
        title=f"Story: {request.character_name}",
        genre=request.genre,
        world_description=request.world_description,
        tone=request.tone,
        nsfw_enabled=request.nsfw_enabled,
        is_god_mode=request.is_god_mode,
        character=CharacterState(
            name=request.character_name,
            backstory=request.character_backstory,
            psychology=CharacterPsychology(),
            economy=CharacterEconomy(),
        ),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # ─── World Builder: Generate ALL world + character data in ONE LLM call ───
    from app.core.world_builder import generate_world_and_character
    from app.models.schemas import CustomTrait, SpecialAbility, PlotTrigger, CharacterSkill, MapLocation, Organization, ShopItem
    
    world_data = await generate_world_and_character(
        genre=request.genre,
        world_description=request.world_description,
        character_name=request.character_name,
        backstory=request.character_backstory or "Bí ẩn"
    )
    
    # --- Locations ---
    valid_locations = []
    for loc in world_data.get("locations", []):
        try:
            valid_locations.append(MapLocation(**loc) if isinstance(loc, dict) else loc)
        except Exception as e:
            print(f"Skipping invalid location: {e}")
    story_config.locations = valid_locations
    
    # --- Organizations ---
    valid_orgs = []
    for org in world_data.get("organizations", []):
        try:
            valid_orgs.append(Organization(**org) if isinstance(org, dict) else org)
        except Exception as e:
            print(f"Skipping invalid organization: {e}")
    story_config.available_organizations = valid_orgs
    
    # --- Shop Items ---
    valid_shop = []
    for item in world_data.get("shop_items", []):
        try:
            valid_shop.append(ShopItem(**item) if isinstance(item, dict) else item)
        except Exception as e:
            print(f"Skipping invalid shop item: {e}")
    story_config.available_shop_items = valid_shop
    
    # --- Auto-detect currency from shop items and set starting money ---
    detected_currencies = set()
    for item in valid_shop:
        ct = item.currency_type if hasattr(item, 'currency_type') else (item.get('currency_type') if isinstance(item, dict) else None)
        if ct and ct.lower() not in ("none", "free", ""):
            detected_currencies.add(ct)
    
    if detected_currencies:
        # Set starting_gold for each currency type the shop uses
        for ct in detected_currencies:
            story_config.character.economy.currencies[ct] = request.starting_gold
    else:
        story_config.character.economy.currencies["Gold"] = request.starting_gold
    
    # --- Character Traits ---
    if world_data.get("traits"):
        valid_traits = []
        for t in world_data["traits"]:
            try:
                valid_traits.append(CustomTrait(**t))
            except Exception as e:
                print(f"Skipping invalid trait {t.get('name')}: {e}")
        story_config.character.traits = valid_traits
    
    # --- Character Abilities (bẩm sinh) ---
    if world_data.get("abilities"):
        valid_abilities = []
        for a in world_data["abilities"]:
            try:
                valid_abilities.append(SpecialAbility(**a))
            except Exception as e:
                print(f"Skipping invalid ability {a.get('name')}: {e}")
        story_config.character.abilities = valid_abilities
    
    # --- Character Skills (học được) ---
    if world_data.get("skills"):
        valid_skills = []
        for s in world_data["skills"]:
            try:
                valid_skills.append(CharacterSkill(**s))
            except Exception as e:
                print(f"Skipping invalid skill {s.get('name')}: {e}")
        story_config.character.skills = valid_skills
        
    # --- Plot Triggers ---
    if world_data.get("plot_triggers"):
        valid_triggers = []
        for p in world_data["plot_triggers"]:
            try:
                valid_triggers.append(PlotTrigger(**p))
            except Exception as e:
                print(f"Skipping invalid plot trigger {p.get('title')}: {e}")
        story_config.plot_triggers = valid_triggers

    # Save to MongoDB
    await db.stories.insert_one(story_config.model_dump())

    return {
        "story_id": story_id,
        "message": "Story created. Proceed to customization.",
        "config": story_config.model_dump(),
    }


# ============================================================
# PUT /customize — Pre-game Customization
# ============================================================
@router.put("/customize")
async def customize_story(request: CustomizeStoryRequest):
    """
    Phase 2 (Pre-game): User customizes traits, abilities, plot triggers, and map.
    This is called AFTER create and BEFORE the first chapter.
    """
    db = await get_mongo_db()

    story = await db.stories.find_one({"story_id": request.story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    update_data = {
        "character.traits": [t.model_dump() for t in request.traits],
        "character.abilities": [a.model_dump() for a in request.abilities],
        "character.skills": [s.model_dump() for s in request.skills],
        "plot_triggers": [p.model_dump() for p in request.plot_triggers],
        "updated_at": datetime.utcnow(),
    }

    # Only update locations if provided (don't overwrite World Builder data)
    if request.locations:
        update_data["locations"] = [loc.model_dump() for loc in request.locations]

    await db.stories.update_one(
        {"story_id": request.story_id},
        {"$set": update_data},
    )

    return {
        "story_id": request.story_id,
        "message": "Customization saved. Ready to begin the story.",
    }


# ============================================================
# POST /start — Generate Opening Chapter (Chapter 1)
# ============================================================
@router.post("/start/{story_id}")
async def start_story(story_id: str):
    """
    Phase 3 (Game Start): Generate the opening chapter.
    Called ONCE after customization, before gameplay begins.
    This creates Chapter 1 — the grand entrance into the world.
    """
    db = await get_mongo_db()

    story = await db.stories.find_one({"story_id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Check if chapter 1 already exists (idempotent)
    existing = await db.chapters.find_one({"story_id": story_id, "chapter_number": 1})
    if existing:
        existing.pop("_id", None)
        story.pop("_id", None)
        return {
            "story_id": story_id,
            "chapter": existing,
            "config": story,
        }

    story_config = StoryConfig(**story)

    # Build a special "opening" action context
    char = story_config.character
    action_context = (
        f"THIS IS THE OPENING CHAPTER. The story begins NOW.\n"
        f"Genre: {story_config.genre}. Tone: {story_config.tone}.\n"
        f"World: {story_config.world_description[:500]}\n"
        f"Character \"{char.name}\" enters the world for the first time.\n"
        f"Backstory: {char.backstory or 'Unknown'}\n"
        f"Write a compelling opening scene that introduces the character, "
        f"establishes the world atmosphere, and ends with a hook that makes the player want to continue."
    )

    initial_state = {
        "story_config": story,
        "player_action": {
            "story_id": story_id,
            "action_type": "custom",
            "custom_action": "Begin the story.",
        },
        "action_context": action_context,
        "chapter_number": 1,
        "is_god_mode": story.get("is_god_mode", False),
        "relevant_memories": [],
        "director_plan": "",
        "web_search_results": [],
        "plot_triggers_activated": [],
        "chapter_title": "",
        "chapter_content": "",
        "chapter_summary": "",
        "state_changes": {},
        "is_game_over": False,
        "choices": [],
        "error": None,
    }

    try:
        final_state = await story_pipeline.ainvoke(initial_state)
    except Exception as e:
        print(f"[ERROR] Opening chapter generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate opening chapter: {str(e)}")

    chapter_title = final_state.get("chapter_title", "Chương 1")
    chapter_content = final_state.get("chapter_content", "The story begins...")
    chapter_summary = final_state.get("chapter_summary", "The story begins.")
    choices = final_state.get("choices", [])
    state_changes = final_state.get("state_changes", {})

    new_chapter = ChapterContent(
        story_id=story_id,
        chapter_number=1,
        chapter_title=chapter_title,
        content=chapter_content,
        summary=chapter_summary,
        choices=[StoryChoice(**c) for c in choices] if choices else [],
    )

    await db.chapters.insert_one(new_chapter.model_dump())

    # Apply state changes
    if state_changes:
        await apply_state_changes(
            story_id=story_id,
            state_changes=state_changes,
            chapter_number=1,
        )

    # Update current chapter counter
    await db.stories.update_one(
        {"story_id": story_id},
        {"$set": {"current_chapter": 1, "updated_at": datetime.utcnow()}}
    )

    # Save to vector memory
    try:
        summary_embedding = await get_text_embedding(chapter_summary)
        await save_story_memory(
            story_id=story_id,
            chapter_number=1,
            text_content=chapter_content[:2000],
            embedding_vector=summary_embedding,
        )
    except Exception as e:
        print(f"[WARNING] Failed to save opening memory: {e}")

    # Reload config after merge
    updated_story = await db.stories.find_one({"story_id": story_id})
    updated_story.pop("_id", None)

    return {
        "story_id": story_id,
        "chapter": new_chapter.model_dump(),
        "config": updated_story,
    }


# ============================================================
# POST /turn — Gameplay Loop (The Heart of the Engine)
# ============================================================
@router.post("/turn")
async def process_turn(request: PlayerActionRequest):
    """
    Phase 3 (Gameplay Loop): Process a player's action and generate the next chapter.
    Includes: API Lock, Pre-processing (buy/move/join), LangGraph Pipeline, State Merger.
    """
    db = await get_mongo_db()

    # ─── 1. API LOCK: Prevent concurrent turns ───
    if request.story_id in _active_locks:
        raise HTTPException(status_code=429, detail="Another turn is being processed. Please wait.")
    _active_locks.add(request.story_id)

    try:
        story = await db.stories.find_one({"story_id": request.story_id})
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        story_config = StoryConfig(**story)

        # ─── Check if story is already over ───
        if story.get("is_ended", False):
            raise HTTPException(status_code=400, detail="This story has ended. Game Over.")

        new_chapter_number = story_config.current_chapter + 1

        # ─── 2. PRE-PROCESS: Handle buy/move/join with PYTHON LOGIC ───
        action_context = _preprocess_action(request, story_config)

        # ─── 3. Build Initial Graph State ───
        initial_state = {
            "story_config": story,
            "player_action": request.model_dump(),
            "action_context": action_context,
            "chapter_number": new_chapter_number,
            "is_god_mode": story.get("is_god_mode", False),
            "relevant_memories": [],
            "director_plan": "",
            "web_search_results": [],
            "plot_triggers_activated": [],
            "chapter_title": "",
            "chapter_content": "",
            "chapter_summary": "",
            "state_changes": {},
            "is_game_over": False,
            "choices": [],
            "error": None,
        }

        # ─── 4. Invoke LangGraph Pipeline ───
        try:
            final_state = await story_pipeline.ainvoke(initial_state)
        except Exception as e:
            print(f"[ERROR] Pipeline failed: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to generate chapter: {str(e)}")

        # ─── 5. Extract Output ───
        chapter_title = final_state.get("chapter_title", f"Chương {new_chapter_number}")
        chapter_content = final_state.get("chapter_content", "Failed to generate text.")
        chapter_summary = final_state.get("chapter_summary", "")
        choices = final_state.get("choices", [])
        state_changes = final_state.get("state_changes", {})
        is_game_over = final_state.get("is_game_over", False)

        new_chapter = ChapterContent(
            story_id=request.story_id,
            chapter_number=new_chapter_number,
            chapter_title=chapter_title,
            content=chapter_content,
            summary=chapter_summary,
            choices=[StoryChoice(**c) for c in choices] if choices else [],
        )

        # ─── 6. Save Chapter to MongoDB ───
        await db.chapters.insert_one(new_chapter.model_dump())

        # ─── 7. Apply State Changes via Robust State Merger ───
        merge_result = await apply_state_changes(
            story_id=request.story_id,
            state_changes=state_changes,
            chapter_number=new_chapter_number,
        )

        # ─── 8. Handle Game Over ───
        if is_game_over:
            await db.stories.update_one(
                {"story_id": request.story_id},
                {"$set": {"is_ended": True}}
            )

        # ─── 9. Save Chapter Text to Qdrant (Vector Memory) ───
        # We save the RAW TEXT (not just summary) so Director can retrieve details later
        try:
            # Save summary embedding for fast similarity search
            summary_embedding = await get_text_embedding(chapter_summary)
            await save_story_memory(
                story_id=request.story_id,
                chapter_number=new_chapter_number,
                text_content=chapter_content[:2000],  # Store raw text (capped)
                embedding_vector=summary_embedding,
            )
            # Also save a second vector with the full chapter for detail retrieval
            if len(chapter_content) > 500:
                content_embedding = await get_text_embedding(chapter_content[:1000])
                await save_story_memory(
                    story_id=request.story_id,
                    chapter_number=new_chapter_number,
                    text_content=chapter_content,
                    embedding_vector=content_embedding,
                )
        except Exception as e:
            print(f"[WARNING] Failed to save memory to Qdrant: {e}")

        # ─── 10. Return Response ───
        # Reload the latest config from DB (after merge)
        updated_story = await db.stories.find_one({"story_id": request.story_id})
        updated_config = StoryConfig(**updated_story) if updated_story else story_config

        return {
            "story_id": request.story_id,
            "chapter": new_chapter.model_dump(),
            "character": updated_config.character.model_dump(),
            "quests": [q.model_dump() for q in updated_config.quests],
            "locations": [loc.model_dump() for loc in updated_config.locations],
            "organizations": [o.model_dump() for o in updated_config.available_organizations],
            "shop_items": [s.model_dump() for s in updated_config.available_shop_items],
            "plot_triggers": [p.model_dump() for p in updated_config.plot_triggers],
            "is_game_over": is_game_over,
        }

    finally:
        # ─── Always release the lock ───
        _active_locks.discard(request.story_id)


# ============================================================
# PATCH /god-mode — Toggle God Mode
# ============================================================
@router.patch("/god-mode/{story_id}")
async def toggle_god_mode(story_id: str, enabled: bool = True):
    """Toggle God Mode on/off for a story."""
    db = await get_mongo_db()
    result = await db.stories.update_one(
        {"story_id": story_id},
        {"$set": {"is_god_mode": enabled}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"story_id": story_id, "is_god_mode": enabled}


# ============================================================
# GET /state — Retrieve Full State
# ============================================================
@router.get("/state/{story_id}")
async def get_story_state(story_id: str):
    """Retrieve the full current state of a story (for page reload / reconnection)."""
    db = await get_mongo_db()

    story = await db.stories.find_one({"story_id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Get ALL chapters for timeline display
    chapters = await db.chapters.find(
        {"story_id": story_id}
    ).sort("chapter_number", 1).to_list(length=1000)

    for ch in chapters:
        ch.pop("_id", None)

    story.pop("_id", None)

    return {
        "story_id": story_id,
        "config": story,
        "chapters": chapters,
        "is_game_over": story.get("is_ended", False),
        "is_processing": story_id in _active_locks,
    }


# ============================================================
# GET /chapters — Retrieve All Chapters
# ============================================================
@router.get("/chapters/{story_id}")
async def get_all_chapters(story_id: str):
    """Retrieve all chapters of a story for reading back."""
    db = await get_mongo_db()

    chapters = await db.chapters.find(
        {"story_id": story_id}
    ).sort("chapter_number", 1).to_list(length=1000)

    for chapter in chapters:
        chapter.pop("_id", None)

    return {"story_id": story_id, "chapters": chapters}


# ============================================================
# HELPER: Pre-process Actions (Python Logic Before AI)
# ============================================================

def _preprocess_action(request: PlayerActionRequest, config: StoryConfig) -> str:
    """
    Converts raw player actions into a natural-language context string for the Director.
    For buy/move/join actions, also validates and applies immediate state changes.
    """
    action_type = request.action_type

    if action_type == "choice":
        # Look up the choice text from the previous chapter's choices
        return f"Player selected choice #{request.choice_id}."

    elif action_type == "custom":
        return f"Player's custom action: \"{request.custom_action}\""

    elif action_type == "move":
        target_id = request.target_location_id or request.custom_action
        target_loc = next((loc for loc in config.locations if loc.location_id == target_id), None)
        if target_loc:
            if not target_loc.is_unlocked:
                return f"Player tried to move to {target_loc.name}, but it is LOCKED. Describe why they can't enter."
            return (
                f"Player is traveling to \"{target_loc.name}\".\n"
                f"Description: {target_loc.description}\n"
                f"Function: {target_loc.function}\n"
                f"Benefits: {target_loc.benefits}\n"
                f"Risks: {target_loc.risks}\n"
                f"Describe the journey and arrival. MUST SET current_location_id to '{target_loc.location_id}' in the state changes output."
            )
        return f"Player tried to move to unknown location '{target_id}'."

    elif action_type == "buy_item":
        item_id = request.item_id or request.custom_action
        item = next((it for it in config.available_shop_items if it.item_id == item_id), None)
        if item:
            player_money = config.character.economy.currencies.get(item.currency_type, 0)
            if player_money >= item.price:
                # Deduction will be handled by State Merger after AI confirms the purchase in the narrative
                return (
                    f"Player is attempting to purchase \"{item.name}\" for {item.price} {item.currency_type}.\n"
                    f"Item description: {item.description}\n"
                    f"Narrative impact: {item.narrative_impact}\n"
                    f"Based on the player's current location, describe the transaction scene.\n"
                    f"If they are NOT at a suitable location (like a market or shop), they cannot buy it right now. Describe their thoughts about needing it instead, and DO NOT deduct money.\n"
                    f"If they ARE at a suitable location, describe the transaction. The Editor MUST deduct {item.price} {item.currency_type} and add EXACTLY item_id '{item.item_id}' to inventory with quantity 1."
                )
            else:
                return (
                    f"Player tried to buy \"{item.name}\" ({item.price} {item.currency_type}) "
                    f"but only has {player_money} {item.currency_type}. "
                    f"Describe the embarrassing scene of not having enough money."
                )
        return f"Player tried to buy unknown item '{item_id}'."

    elif action_type == "join_faction":
        org_id = request.org_id or request.custom_action
        org = next((o for o in config.available_organizations if o.org_id == org_id), None)
        if org:
            # Check join requirements
            unmet = []
            for req_name, req_val in org.join_requirements.items():
                # Check traits
                trait = next((t for t in config.character.traits if t.name.lower() == req_name.lower()), None)
                if trait and trait.current_value < req_val:
                    unmet.append(f"{req_name} ({trait.current_value}/{req_val})")
                elif not trait:
                    unmet.append(f"{req_name} (not found)")

            if unmet:
                return (
                    f"Player requested to join \"{org.name}\" but does NOT meet requirements: {', '.join(unmet)}.\n"
                    f"Describe the rejection scene. The faction representative explains what the player lacks."
                )
            return (
                f"Player is expressing interest in finding out more about or joining \"{org.name}\" ({org.type}).\n"
                f"Description: {org.public_description}\n"
                f"Danger Level: {org.danger_level}/10\n"
                f"Based on the player's current location, describe them trying to make contact, asking around, or taking the first step.\n"
                f"If they succeed, the Editor MUST add a FactionChange setting status to 'Member' for EXACTLY org_id '{org.org_id}'."
            )
        return f"Player tried to join unknown faction '{org_id}'."

    return f"Player performed action: {action_type}"


# ============================================================
# POST /factions/search — Dynamic Faction Searching
# ============================================================
@router.post("/factions/search")
async def search_faction(request: SearchFactionRequest):
    """
    Search for a real-world organization and adapt it into the game's lore.
    Uses DDGS Web Search and LLM to dynamically create a Faction object.
    """
    db = await get_mongo_db()
    
    # 1. Retrieve story context
    story = await db.stories.find_one({"story_id": request.story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    config = StoryConfig(**story)
    
    # 2. Check if faction already exists (prevent duplicates)
    for org in config.available_organizations:
        if request.query.lower() in org.name.lower():
            return {
                "status": "exists",
                "message": f"Thế lực '{org.name}' đã tồn tại trong thế giới của bạn.",
                "faction": org.model_dump()
            }
            
    # 3. Perform Web Search
    from app.services.web_search import web_search
    search_results = web_search.invoke(request.query)
    
    # 4. Generate Faction with LLM
    from app.core.llm_factory import get_llm
    from app.core.config import get_settings
    import json
    import uuid
    import re
    
    llm = get_llm(get_settings().director_model, temperature=0.7)
    
    prompt = f"""
    You are a Game World Builder. The user wants to add a faction based on the query: "{request.query}".
    The current story genre is "{config.genre}" and the world is: "{config.world_description}".
    
    Web Search Results for "{request.query}":
    {search_results}
    
    Your task:
    1. If the query is a real-world organization (like CIA, FBI, Google), ADAPT it to fit perfectly into the "{config.genre}" setting.
       - If it's a medieval fantasy, "CIA" becomes a royal spy guild. "NASA" becomes a stargazers cult.
       - If the setting matches the organization's real world context (e.g. Modern/Spy), keep it as the real organization.
    2. If the query is completely fictional, create it from scratch fitting the genre.
    
    Output exactly ONE valid JSON object matching this schema:
    {{
        "name": "Name of the organization (adapted to lore)",
        "type": "government / academic / corporate / underworld / religious / military",
        "is_real_world_based": true or false,
        "public_description": "What people know about it",
        "hidden_lore": "A dark secret or hidden agenda",
        "join_requirements": {{"Trust": 20}} (a dict of string to int, or empty {{}}),
        "benefits_description": "What members get",
        "danger_level": 1-10 (integer)
    }}
    
    Do NOT output any markdown blocks like ```json, just output the raw JSON string.
    """
    
    response = await llm.ainvoke(prompt)
    content = response.content
    
    # Fallback JSON parsing (in case of markdown blocks)
    match = re.search(r'\{.*\}', content, re.DOTALL)
    if match:
        content = match.group(0)
        
    try:
        data = json.loads(content)
        new_org = Organization(
            org_id=f"org_{str(uuid.uuid4())[:8]}",
            name=data.get("name", request.query),
            type=data.get("type", "unknown"),
            is_real_world_based=data.get("is_real_world_based", False),
            public_description=data.get("public_description", "No info."),
            hidden_lore=data.get("hidden_lore", ""),
            join_requirements=data.get("join_requirements", {}),
            benefits_description=data.get("benefits_description", ""),
            danger_level=data.get("danger_level", 5)
        )
        
        # 5. Save to Database
        config.available_organizations.append(new_org)
        await db.stories.update_one(
            {"story_id": request.story_id},
            {"$push": {"available_organizations": new_org.model_dump()}}
        )
        
        return {
            "status": "success",
            "message": "Thế lực đã được tìm thấy và thêm vào danh bạ.",
            "faction": new_org.model_dump()
        }
    except Exception as e:
        print(f"[ERROR] Failed to parse dynamic faction JSON: {e}\nContent: {content}")
        raise HTTPException(status_code=500, detail="Failed to generate faction data. Please try again.")

