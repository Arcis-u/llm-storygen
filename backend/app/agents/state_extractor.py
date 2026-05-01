"""
Node 4: State Extractor Agent.
Reads the chapter text and extracts ALL state changes into strict JSON.
Also determines if the character died (Game Over flag).
Uses GPT-4o-mini for speed and cost efficiency.
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
import json

from app.graph.state import GraphState
from app.core.config import get_settings


# ─── Output Schemas ──────────────────────────────────────────

class PsychologyChange(BaseModel):
    stress_change: int = Field(default=0, description="Positive = more stressed, negative = calmer.")
    mood: str = Field(description="The character's new mood after this chapter.")
    current_thoughts: str = Field(description="One sentence: what is the character thinking right now?")

class InventoryChange(BaseModel):
    item_id: str = Field(description="Unique ID of the item.")
    name: str = Field(description="Display name of the item.")
    quantity_change: int = Field(default=0, description="Positive = gained, negative = lost/used.")

class EconomyChange(BaseModel):
    currency_changes: dict[str, float] = Field(default_factory=dict, description="e.g. {'Gold': -50}")
    inventory_changes: list[InventoryChange] = Field(default_factory=list)

class RelationshipChange(BaseModel):
    npc_name: str
    npc_title: str = ""
    trust_change: int = 0
    affection_change: int = 0
    hostility_change: int = 0

class FactionChange(BaseModel):
    org_id: str
    org_name: str
    reputation_change: int = 0
    new_status: str = Field(default="", description="unaware/known/member/leader/enemy. Empty = no change.")

class TraitChange(BaseModel):
    trait_name: str
    change_amount: float = Field(description="Positive or negative change to the trait value.")

class StateDiff(BaseModel):
    psychology: PsychologyChange
    trait_changes: list[TraitChange] = Field(default_factory=list, description="Changes to custom character traits (e.g. Lý trí, Ám ảnh, Thể lực).")
    economy: EconomyChange
    relationships: list[RelationshipChange] = Field(default_factory=list)
    factions: list[FactionChange] = Field(default_factory=list)
    current_location_id: str = Field(
        default="", 
        description="If the character traveled and arrived at a new location in this chapter, output the location_id here. Otherwise leave empty."
    )
    triggered_events: list[str] = Field(
        default_factory=list,
        description="Titles of plot events that were triggered/resolved in this chapter."
    )
    new_locations: list[dict] = Field(
        default_factory=list,
        description="New locations discovered in this chapter. Each dict: {location_id, name, description, function, benefits, risks, x_position, y_position, connected_to}."
    )
    new_shop_items: list[dict] = Field(
        default_factory=list,
        description="New items that became available. Each dict: {item_id, name, category, price, currency_type, description, narrative_impact}."
    )
    new_organizations: list[dict] = Field(
        default_factory=list,
        description="New factions/organizations encountered. Each dict: {org_id, name, type, public_description, danger_level}."
    )
    is_game_over: bool = Field(
        default=False,
        description="True ONLY if the character definitively died or the story reached a final ending."
    )


SYSTEM_PROMPT = """You are the State Extractor for an interactive RPG engine.
Read the story chapter below and determine EXACTLY what changed in the character's state.

# CURRENT CHARACTER STATE (Before this chapter)
{character_state}

# AVAILABLE LOCATIONS (with IDs)
{available_locations}

# EXTRACTION RULES
1. Only report ACTUAL changes that happened in the chapter text. Do NOT invent changes.
2. If nothing changed for a category, return empty/zero values.
3. For `is_game_over`: set to True ONLY if the character clearly, definitively DIED or the story reached an absolute end. Injuries, unconsciousness, or danger do NOT count as game over.
4. For `triggered_events`: list the titles of any major plot events that occurred.
5. Be precise with numbers. Small interactions = small changes (±5). Major events = larger changes (±15-30).
6. DYNAMIC WORLD: If the chapter mentions a NEW location, faction, or acquirable item that doesn't exist in the current state, add it to `new_locations`, `new_organizations`, or `new_shop_items` respectively. Only add genuinely new discoveries.
7. TRAITS: Look closely at the "traits" in the CURRENT CHARACTER STATE. If the narrative implies a change to any of these traits (e.g., getting hurt -> lower health, seeing a ghost -> higher fear/ám ảnh), output it in `trait_changes`.
8. LOCATION: If the chapter describes the character ARRIVING at or ENTERING a specific place listed in AVAILABLE LOCATIONS, output its `location_id` in `current_location_id`. This is CRITICAL for map tracking.
9. RELATIONSHIPS: If the character interacts with ANY named NPC (talking, fighting, meeting), ALWAYS add a `RelationshipChange` for that NPC. Set `trust_change`, `affection_change`, or `hostility_change` based on the interaction type. For first meetings, create a new relationship entry.
10. BẮT BUỘC: Viết tất cả nội dung (mood, thoughts, tên vật phẩm, mô tả) bằng TIẾNG VIỆT.
"""


async def state_extractor_node(state: GraphState) -> GraphState:
    print("--- NODE 4: STATE EXTRACTOR ---")

    settings = get_settings()
    if not (settings.openai_api_key or settings.gemini_api_key or settings.groq_api_key or settings.huggingface_api_key):
        print("[WARNING] No API key. Returning empty state diff.")
        state["state_changes"] = {
            "psychology": {"stress_change": 0, "mood": "neutral", "current_thoughts": "Thinking about the future."},
            "trait_changes": [],
            "economy": {"currency_changes": {}, "inventory_changes": []},
            "relationships": [],
            "factions": [],
            "current_location_id": "",
            "triggered_events": [],
            "new_locations": [],
            "new_shop_items": [],
            "new_organizations": [],
            "is_game_over": False
        }
        state["is_game_over"] = False
        return state

    from app.core.llm_factory import get_llm
    llm = get_llm(settings.editor_model, temperature=0.1)

    config = state["story_config"]
    char = config.get("character", {})

    # Build a compact character state string (save tokens)
    locations = config.get("locations", [])
    current_loc = next((l for l in locations if l.get("is_current")), None)
    compact_char = {
        "name": char.get("name"),
        "current_location": current_loc.get("name") if current_loc else "Unknown",
        "current_location_id": current_loc.get("location_id") if current_loc else "",
        "mood": char.get("psychology", {}).get("mood"),
        "stress": char.get("psychology", {}).get("stress_level"),
        "traits": [f"{t.get('name')}: {t.get('current_value')}/{t.get('max_value')}" for t in char.get("traits", [])],
        "currencies": char.get("economy", {}).get("currencies"),
        "inventory": [it.get("name") for it in char.get("economy", {}).get("inventory", [])],
        "relationships": [f"{r.get('npc_name')} (trust:{r.get('trust')}, affection:{r.get('affection')})" for r in char.get("relationships", [])],
    }

    available_locs_str = "\n".join(
        [f"- {l.get('location_id')}: {l.get('name')}" for l in locations]
    ) or "No locations defined yet."

    prompt_str = SYSTEM_PROMPT.format(
        character_state=json.dumps(compact_char, ensure_ascii=False, indent=2),
        available_locations=available_locs_str,
    )

    try:
        # Try structured output first
        structured_llm = llm.with_structured_output(StateDiff)
        messages = [
            SystemMessage(content=prompt_str),
            HumanMessage(content=f"Chapter text:\n\n{state.get('chapter_content', '')}")
        ]
        response: StateDiff = await structured_llm.ainvoke(messages)
        state["state_changes"] = response.model_dump()
        state["is_game_over"] = response.is_game_over

        if response.is_game_over:
            print("[STATE EXTRACTOR] GAME OVER detected!")
        print(f"[STATE EXTRACTOR] Extracted: mood={response.psychology.mood}, stress_delta={response.psychology.stress_change}")

    except Exception as e:
        print(f"[STATE EXTRACTOR] Structured output failed ({e}), falling back to JSON text...")
        try:
            messages = [
                SystemMessage(content=prompt_str + "\n\nRespond with ONLY valid JSON matching the schema. No other text."),
                HumanMessage(content=f"Chapter text:\n\n{state.get('chapter_content', '')}")
            ]
            response = await llm.ainvoke(messages)
            raw = response.content if hasattr(response, 'content') else str(response)
            
            # Robust JSON extraction
            start = raw.find('{')
            end = raw.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = raw[start:end+1]
                parsed = json.loads(json_str)
                state["state_changes"] = parsed
                state["is_game_over"] = parsed.get("is_game_over", False)
                print(f"[STATE EXTRACTOR] Extracted via robust JSON parsing")
            else:
                raise ValueError("No JSON object '{...}' found in response")
        except Exception as e2:
            print(f"[STATE EXTRACTOR ERROR] Both methods failed: {e2}")
            state["state_changes"] = {
                "psychology": {"stress_change": 5, "mood": "tense", "current_thoughts": "Processing what just happened."},
                "trait_changes": [],
                "economy": {"currency_changes": {}, "inventory_changes": []},
                "relationships": [],
                "factions": [],
                "current_location_id": "",
                "triggered_events": [],
                "new_locations": [],
                "new_shop_items": [],
                "new_organizations": [],
                "is_game_over": False
            }
            state["is_game_over"] = False

    return state

