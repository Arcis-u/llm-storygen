"""
Story API Router (v2 — Production-Grade).
Handles: creation (with World Builder), customization, gameplay turns (with API Lock,
pre-processing logic for buy/move/join, State Merger integration), and state retrieval.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional
import uuid

from app.core.security import get_current_user_optional, get_current_user
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
    NPCRelationship,
    StorySettingsUpdate,
    InstantActionRequest,
    IntentActionRequest,
    CraftActionRequest,
)

router = APIRouter(prefix="/api/story", tags=["story"])

# ─── In-memory lock set to prevent concurrent turns on same story ───
_active_locks: set[str] = set()


# ============================================================
# POST /create — World Builder
# ============================================================
@router.post("/create")
async def create_story(request: CreateStoryRequest, user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Phase 1: Create a new story from the user's initial prompt.
    In Phase 5, the World Builder Agent will auto-generate locations, factions, and shop items.
    For now, we create a rich default world structure based on genre.
    """
    db = await get_mongo_db()
    story_id = str(uuid.uuid4())

    # Build initial story config with sensible defaults
    # Determine user_id from auth token or fallback to anonymous
    user_id = user["user_id"] if user else "anonymous"

    # Enforce God Mode for Admin only
    is_god_mode = request.is_god_mode
    if is_god_mode and (not user or user.get("role") != "admin"):
        is_god_mode = False

    story_config = StoryConfig(
        story_id=story_id,
        user_id=user_id,
        title=f"Story: {request.character_name}",
        genre=request.genre,
        world_description=request.world_description,
        tone=request.tone,
        nsfw_enabled=request.nsfw_enabled,
        is_god_mode=is_god_mode,
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

    # --- Override simple prompt with AI-generated rich descriptions ---
    story_config.world_description = world_data.get("generated_world_description", request.world_description)
    story_config.character.backstory = world_data.get("generated_backstory", request.character_backstory)
    
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

    # --- Initial NPCs (Relationships) ---
    if world_data.get("initial_npcs"):
        valid_npcs = []
        for npc in world_data["initial_npcs"]:
            try:
                valid_npcs.append(NPCRelationship(
                    npc_name=npc.get("npc_name", "Unknown"),
                    npc_title=npc.get("npc_title", ""),
                    trust=npc.get("trust", 50),
                    affection=npc.get("affection", 50),
                    hostility=npc.get("hostility", 0),
                    last_interaction_chapter=0,
                ))
            except Exception as e:
                print(f"Skipping invalid NPC {npc.get('npc_name')}: {e}")
        story_config.character.relationships = valid_npcs
        print(f"[WORLD BUILDER] Created {len(valid_npcs)} initial NPC relationships")

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
        tone=final_state.get("tone", "ambient"),
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
            tone=final_state.get("tone", "ambient"),
            choices=[StoryChoice(**c) for c in choices] if choices else [],
        )

        # ─── 6. Save Chapter to MongoDB ───
        await db.chapters.insert_one(new_chapter.model_dump())

        # ─── 6.5. Hardcode Location Update if Move Action ───
        if request.action_type == "move":
            target = request.target_location_id or request.custom_action
            if target:
                state_changes["current_location_id"] = target
                print(f"[FALLBACK] Forced current_location_id to {target}")

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
        base_context = f"Player selected choice #{request.choice_id}."
        if request.dice_result is not None:
            dice = request.dice_result
            if dice == 1:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (CRITICAL FAILURE)]. Mệnh lệnh cho Director: Hành động này RÚT CỤC ĐÃ THẤT BẠI THẢM HẠI do xui xẻo. Hãy miêu tả hậu quả tồi tệ nhất có thể xảy ra, tổn thương nặng nề đến cơ thể hoặc tinh thần (giảm mạnh HP/Energy). Đừng khoan nhượng."
            elif 2 <= dice <= 9:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (FAILURE)]. Mệnh lệnh cho Director: Hành động này ĐÃ THẤT BẠI. Hãy miêu tả hậu quả tiêu cực, sai lầm, hoặc bị thương nhẹ (giảm HP)."
            elif 10 <= dice <= 19:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (SUCCESS)]. Mệnh lệnh cho Director: Hành động này ĐÃ THÀNH CÔNG. Hãy miêu tả người chơi vượt qua thử thách một cách suôn sẻ."
            elif dice == 20:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (CRITICAL SUCCESS)]. Mệnh lệnh cho Director: Hành động này ĐÃ THÀNH CÔNG RỰC RỠ. Hãy miêu tả một phép màu hoặc sự thể hiện xuất thần, mang lại phần thưởng ngoài mong đợi."
        return base_context

    elif action_type == "custom":
        base_context = f"Player's custom action: \"{request.custom_action}\""
        if request.dice_result is not None:
            dice = request.dice_result
            if dice == 1:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (CRITICAL FAILURE)]. Mệnh lệnh cho Director: Hành động này RÚT CỤC ĐÃ THẤT BẠI THẢM HẠI do xui xẻo. Hãy miêu tả hậu quả tồi tệ nhất có thể xảy ra, tổn thương nặng nề đến cơ thể hoặc tinh thần (giảm mạnh HP/Energy). Đừng khoan nhượng."
            elif 2 <= dice <= 9:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (FAILURE)]. Mệnh lệnh cho Director: Hành động này ĐÃ THẤT BẠI. Hãy miêu tả hậu quả tiêu cực, sai lầm, hoặc bị thương nhẹ (giảm HP)."
            elif 10 <= dice <= 19:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (SUCCESS)]. Mệnh lệnh cho Director: Hành động này ĐÃ THÀNH CÔNG. Hãy miêu tả người chơi vượt qua thử thách một cách suôn sẻ."
            elif dice == 20:
                base_context += f"\n[RNG OUTCOME: D20 Roll = {dice} (CRITICAL SUCCESS)]. Mệnh lệnh cho Director: Hành động này ĐÃ THÀNH CÔNG RỰC RỠ. Hãy miêu tả một phép màu hoặc sự thể hiện xuất thần, mang lại phần thưởng ngoài mong đợi."
        return base_context

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


# ============================================================
# PUT /{story_id}/settings — Update story metadata
# ============================================================
@router.put("/{story_id}/settings")
async def update_story_settings(story_id: str, request: StorySettingsUpdate, user: dict = Depends(get_current_user)):
    db = await get_mongo_db()
    
    update_data = {}
    if request.title is not None:
        update_data["title"] = request.title
    if request.cover_image is not None:
        update_data["cover_image"] = request.cover_image
        
    if not update_data:
        return {"status": "success"}
        
    result = await db.stories.update_one(
        {"story_id": story_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found or unauthorized")
        
    return {"status": "success", "message": "Settings updated"}

# ============================================================
# POST /action/instant — UI/System Actions (No AI)
# ============================================================
@router.post("/action/instant")
async def process_instant_action(request: InstantActionRequest, user: dict = Depends(get_current_user)):
    db = await get_mongo_db()
    story = await db.stories.find_one({"story_id": request.story_id, "user_id": user["user_id"]})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    config = StoryConfig(**story)
    
    if request.action_type == "buy_item":
        item_id = request.item_id
        shop_item = next((i for i in config.available_shop_items if i.item_id == item_id), None)
        if not shop_item:
            raise HTTPException(status_code=404, detail="Item not found")
            
        currency = shop_item.currency_type or "Gold"
        balance = config.character.economy.currencies.get(currency, 0.0)
        
        if balance < shop_item.price:
            raise HTTPException(status_code=400, detail="Insufficient funds")
            
        # Deduct money and add item
        config.character.economy.currencies[currency] -= shop_item.price
        
        # Check if item exists in inventory
        existing = next((i for i in config.character.economy.inventory if i.item_id == item_id), None)
        if existing:
            existing.quantity += 1
        else:
            from app.models.schemas import InventoryItem
            config.character.economy.inventory.append(
                InventoryItem(item_id=item_id, name=shop_item.name, quantity=1)
            )
            
        await db.stories.update_one(
            {"story_id": request.story_id},
            {"$set": {"character.economy": config.character.economy.model_dump()}}
        )
        return {"status": "success", "message": f"Bought {shop_item.name}", "economy": config.character.economy.model_dump()}
    
    return {"status": "error", "message": "Unknown action type"}


# ============================================================
# POST /action/craft — Crafting System
# ============================================================
@router.post("/action/craft")
async def process_crafting(request: CraftActionRequest, user: dict = Depends(get_current_user)):
    from app.core.config import get_settings
    from app.core.llm_factory import get_llm
    from langchain_core.messages import SystemMessage, HumanMessage
    import json
    import uuid
    
    db = await get_mongo_db()
    story = await db.stories.find_one({"story_id": request.story_id, "user_id": user["user_id"]})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    config = StoryConfig(**story)
    inv = config.character.economy.inventory
    
    item1 = next((i for i in inv if i.item_id == request.item_id_1), None)
    item2 = next((i for i in inv if i.item_id == request.item_id_2), None)
    
    if not item1 or not item2:
        raise HTTPException(status_code=400, detail="Missing items in inventory")
        
    # Generate new item via LLM
    settings = get_settings()
    llm = get_llm(settings.gamemaster_model, temperature=0.7)
    
    prompt = f"""You are the Crafting Master of an RPG.
The player is combining two items:
1. "{item1.name}"
2. "{item2.name}"

Story Genre: {config.genre}
Tone: {config.tone}

If these items can logically combine, create a new, better item. 
If they cannot logically combine, create a "Trash" or "Failed Experiment" item.
Respond ONLY in valid JSON format:
{{
  "name": "New Item Name",
  "is_crafting_material": true or false
}}
"""
    try:
        messages = [SystemMessage(content=prompt), HumanMessage(content="Combine them now.")]
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, 'content') else str(response)
        
        start = raw.find('{')
        end = raw.rfind('}')
        if start != -1 and end != -1:
            parsed = json.loads(raw[start:end+1])
        else:
            raise ValueError("No JSON found")
            
        new_name = parsed.get("name", "Vật phẩm kì dị")
        is_mat = parsed.get("is_crafting_material", False)
        
    except Exception as e:
        print(f"[CRAFTING ERROR] {e}")
        new_name = f"Mảnh vỡ của {item1.name} và {item2.name}"
        is_mat = False

    # Remove 1 quantity from item1 and item2
    for item in [item1, item2]:
        item.quantity -= 1
        
    # Filter out items with 0 quantity
    config.character.economy.inventory = [i for i in inv if i.quantity > 0]
    
    # Add new item
    from app.models.schemas import InventoryItem
    new_item_id = str(uuid.uuid4())
    config.character.economy.inventory.append(
        InventoryItem(item_id=new_item_id, name=new_name, quantity=1, is_crafting_material=is_mat)
    )
    
    await db.stories.update_one(
        {"story_id": request.story_id},
        {"$set": {"character.economy.inventory": [i.model_dump() for i in config.character.economy.inventory]}}
    )
    
    return {
        "status": "success", 
        "message": f"Ghép thành công: {new_name}!",
        "economy": config.character.economy.model_dump()
    }

# ============================================================
# POST /action/intent — Add Intent to Psychology
# ============================================================
@router.post("/action/intent")
async def add_character_intent(request: IntentActionRequest, user: dict = Depends(get_current_user)):
    db = await get_mongo_db()
    story = await db.stories.find_one({"story_id": request.story_id, "user_id": user["user_id"]})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
        
    config = StoryConfig(**story)
    
    intent_msg = ""
    if request.intent_type == "join_faction":
        intent_msg = f"Đang nung nấu ý định tìm cách gia nhập tổ chức '{request.target_name}'."
    elif request.intent_type == "investigate":
        intent_msg = f"Muốn bí mật thu thập thông tin và tìm hiểu về '{request.target_name}'."
    else:
        intent_msg = f"Muốn {request.intent_type} {request.target_name}."
        
    if intent_msg not in config.character.psychology.desires:
        config.character.psychology.desires.append(intent_msg)
        
    await db.stories.update_one(
        {"story_id": request.story_id},
        {"$set": {"character.psychology.desires": config.character.psychology.desires}}
    )
    return {"status": "success", "message": f"Added intent: {intent_msg}"}


# ============================================================
# GET /user/me — List all stories for authenticated user
# ============================================================
@router.get("/user/me")
async def list_my_stories(user: dict = Depends(get_current_user)):
    """
    Returns a summary of all stories belonging to the authenticated user.
    Used by the Dashboard page.
    """
    db = await get_mongo_db()
    stories = await db.stories.find(
        {"user_id": user["user_id"]},
        {
            "_id": 0,
            "story_id": 1,
            "title": 1,
            "cover_image": 1,
            "genre": 1,
            "world_description": 1,
            "tone": 1,
            "current_chapter": 1,
            "total_turns": 1,
            "is_ended": 1,
            "is_god_mode": 1,
            "character.name": 1,
            "character.traits": 1,
            "character.skills": 1,
            "character.abilities": 1,
            "character.relationships": 1,
            "character.economy.currencies": 1,
            "locations": 1,
            "available_organizations": 1,
            "plot_triggers": 1,
            "created_at": 1,
            "updated_at": 1,
        }
    ).sort("created_at", -1).to_list(50)

    for s in stories:
        if "created_at" in s:
            s["created_at"] = str(s["created_at"])
        if "updated_at" in s:
            s["updated_at"] = str(s["updated_at"])

    return {"stories": stories}


# ============================================================
# DELETE /{story_id} — Delete a story
# ============================================================
@router.delete("/{story_id}")
async def delete_story(story_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a story and all its chapters. 
    Admin can delete any story; regular users can only delete their own.
    """
    db = await get_mongo_db()
    story = await db.stories.find_one({"story_id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Ownership check (admin bypasses)
    if user.get("role") != "admin" and story.get("user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your story")

    await db.chapters.delete_many({"story_id": story_id})
    await db.stories.delete_one({"story_id": story_id})

    # Also clean Qdrant vectors for this story
    try:
        from app.core.database import get_qdrant
        from app.core.config import get_settings
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        settings = get_settings()
        qdrant = get_qdrant()
        qdrant.delete(
            collection_name=settings.qdrant_collection_name,
            points_selector=Filter(
                must=[FieldCondition(key="story_id", match=MatchValue(value=story_id))]
            ),
        )
    except Exception as e:
        print(f"[WARN] Failed to clean Qdrant vectors for {story_id}: {e}")

    return {"deleted": True, "story_id": story_id}

