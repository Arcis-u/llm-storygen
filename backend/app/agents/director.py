"""
Node 2: Director Agent (ReAct Framework with Tool Calling).
The "brain" of the engine. Reasons about the situation, calls tools to gather info,
scans Plot Triggers, and outputs a strategic plan for the Writer.
Does NOT write prose — only outlines what should happen.
"""

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from pydantic import BaseModel, Field
import json
import random

from app.graph.state import GraphState
from app.services.web_search import web_search
from app.core.database import get_qdrant
from app.services.embedding import get_text_embedding
from app.core.config import get_settings


# ============================================================
# TOOLS: The Director can call these to gather information
# ============================================================

@tool
async def search_story_memory(query: str) -> str:
    """Search past story chapters for specific details. Use when you need to recall
    something from earlier in the story (names, events, promises, items found, etc.)."""
    settings = get_settings()
    qdrant = get_qdrant()
    try:
        collections = [c.name for c in qdrant.get_collections().collections]
        if settings.qdrant_collection_name not in collections:
            return "No memories found — this is early in the story."
        
        query_vector = await get_text_embedding(query)
        results = qdrant.search(
            collection_name=settings.qdrant_collection_name,
            query_vector=query_vector,
            limit=3,
        )
        if not results:
            return "No relevant memories found for this query."
        
        texts = [f"[Ch.{r.payload.get('chapter_number', '?')}] {r.payload.get('text', '')}" for r in results if r.score > 0.25]
        return "\n".join(texts) if texts else "No strong matches found."
    except Exception as e:
        return f"Memory search failed: {e}"


@tool
def search_web_info(query: str) -> str:
    """Search the internet for real-world factual information. Use ONLY when the story
    involves real-world organizations, historical events, or factual details that
    need to be accurate."""
    try:
        result = web_search.invoke({"query": query})
        return str(result)[:2000]  # Limit to 2000 chars to save tokens
    except Exception as e:
        return f"Web search failed: {e}"


# ============================================================
# PLOT TRIGGER SCANNER (Pure Python, no LLM cost)
# ============================================================

def scan_plot_triggers(config: dict, chapter_number: int) -> tuple[list[str], str]:
    """
    Scans plot_triggers array. Returns (activated_titles, instruction_text).
    Uses probability dice roll and checks earliest_chapter constraint.
    """
    triggers = config.get("plot_triggers", [])
    activated = []
    instructions = []

    for pt in triggers:
        if pt.get("triggered", False):
            continue  # Already fired
        if chapter_number < pt.get("earliest_chapter", 1):
            continue  # Too early

        probability = pt.get("probability", 0.5)
        importance = pt.get("importance", 5)

        # Higher importance = higher chance multiplier
        effective_prob = min(1.0, probability * (1 + (importance - 5) * 0.1))
        roll = random.random()

        if roll <= effective_prob:
            activated.append(pt.get("title", "Unknown Trigger"))
            instructions.append(
                f"[ALERT] PLOT TRIGGER ACTIVATED: \"{pt['title']}\"\n"
                f"   Description: {pt.get('description', '')}\n"
                f"   Importance: {importance}/10\n"
                f"   You MUST weave this event into your plan. It overrides normal flow."
            )

    combined = "\n\n".join(instructions) if instructions else ""
    return activated, combined


# ============================================================
# ABILITY SIDE-EFFECTS SCANNER
# ============================================================

def scan_ability_constraints(config: dict, action_context: str) -> str:
    """
    If the player's action mentions using an ability, check for side effects
    and return enforcement instructions for the Director.
    """
    abilities = config.get("character", {}).get("abilities", [])
    if not abilities:
        return ""

    context_lower = action_context.lower()
    enforcements = []
    for ab in abilities:
        ab_name = ab.get("name", "").lower()
        if ab_name and ab_name in context_lower:
            for se in ab.get("side_effects", []):
                enforcements.append(
                    f"[WARNING] ABILITY SIDE-EFFECT: Player used \"{ab['name']}\".\n"
                    f"   Consequence: {se.get('description', 'Unknown')}\n"
                    f"   Narrative: {se.get('narrative_consequence', '')}\n"
                    f"   You MUST instruct the Writer to depict this consequence."
                )
    return "\n\n".join(enforcements)


# ============================================================
# SYSTEM PROMPT (Premium Prompt Engineering)
# ============================================================

DIRECTOR_SYSTEM = """You are the **Director** of an interactive RPG story engine.
Your role is to plan (NOT write) what happens in the next chapter.

# YOUR RESPONSIBILITIES
1. Analyze the player's action and the current world state.
2. If you need details from past chapters, call the `search_story_memory` tool.
3. If the story involves real-world organizations/facts, call the `search_web_info` tool.
4. Create dramatic tension. NEVER let the player achieve goals too easily.
5. Respect ALL ability side-effects and plot trigger constraints below.

# WORLD STATE
Genre: {genre} | Tone: {tone}
World: {world_description}

# CHARACTER
Name: {char_name} | Mood: {mood} | Stress: {stress}/100
Currencies: {currencies}
Active Quests: {quests_summary}
Abilities: {abilities_summary}

# RECENT MEMORIES (Last 3 chapters summaries)
{recent_summaries}

# PLOT TRIGGER ENFORCEMENT (from user's pre-game setup)
{plot_trigger_instructions}

# ABILITY SIDE-EFFECT ENFORCEMENT
{ability_enforcement}

# GOD MODE: {god_mode_status}

# OUTPUT FORMAT
Return a detailed plan as a JSON object with:
- `director_plan`: A multi-paragraph strategic outline of what happens. Include pacing, emotional beats, NPC reactions, and environmental details. Do NOT write prose — just outline events and instructions for the Writer.
- `plot_triggers_activated`: List of plot trigger titles you activated (if any).

# RULES FOR PLAN
- BẮT BUỘC: Kế hoạch (director_plan) phải được viết bằng TIẾNG VIỆT 100%.
- LƯU Ý QUAN TRỌNG VỀ GAME MECHANICS: Đừng ra lệnh cho Writer xuất thông báo kiểu "[CÓ/KHÔNG]" hoặc "Bạn bị trừ 50 Gold". Nếu hệ thống truyện (như Cyberpunk/LitRPG) có cơ chế giao diện cho nhân vật, hãy miêu tả nó như một phần của câu chuyện (vd: "Một dòng chữ đỏ hiện lên trên kính võng mạc"). Truyện là thuần tương tác tiểu thuyết.
"""


# ============================================================
# DIRECTOR OUTPUT SCHEMA
# ============================================================

class DirectorOutput(BaseModel):
    director_plan: str = Field(description="Detailed strategic outline for the Writer Agent.")
    plot_triggers_activated: list[str] = Field(
        default_factory=list,
        description="Titles of plot triggers that were activated this turn."
    )


# ============================================================
# DIRECTOR NODE (ReAct Agent)
# ============================================================

async def director_node(state: GraphState) -> GraphState:
    print("--- NODE 2: DIRECTOR (ReAct) ---")

    settings = get_settings()
    if not (settings.openai_api_key or settings.anthropic_api_key or settings.gemini_api_key or settings.groq_api_key):
        state["director_plan"] = "[MOCK] The character explores. Something dramatic happens."
        state["web_search_results"] = []
        state["plot_triggers_activated"] = []
        return state

    config = state["story_config"]
    char = config.get("character", {})
    action_context = state.get("action_context", "Player continues the story.")
    chapter_number = state.get("chapter_number", 1)
    is_god_mode = state.get("is_god_mode", False)

    # ─── 1. Scan Plot Triggers (Free, no LLM cost) ───
    activated_titles, trigger_instructions = scan_plot_triggers(config, chapter_number)

    # ─── 2. Scan Ability Side-Effects (Free) ───
    ability_enforcement = scan_ability_constraints(config, action_context)

    # ─── 3. Build recent chapter summaries (from DB, last 3) ───
    from app.core.database import get_mongo_db
    db = await get_mongo_db()
    recent_chapters = await db.chapters.find(
        {"story_id": config.get("story_id")},
        sort=[("chapter_number", -1)],
    ).to_list(length=3)
    recent_summaries = "\n".join([
        f"Ch.{ch['chapter_number']}: {ch.get('summary', 'No summary')}"
        for ch in reversed(recent_chapters)
    ]) or "No previous chapters yet."

    # ─── 4. Build Quests & Abilities summaries ───
    quests = config.get("quests", [])
    quests_summary = ", ".join([f"{q['title']} ({q.get('priority', 'long_term')})" for q in quests if q.get("status") == "active"]) or "None"

    abilities = char.get("abilities", [])
    abilities_summary = ", ".join([f"{a['name']} (Lv.{a.get('power_level', 1)})" for a in abilities]) or "None"

    # ─── 5. Build System Prompt ───
    system_prompt = DIRECTOR_SYSTEM.format(
        genre=config.get("genre", "Fantasy"),
        tone=config.get("tone", "dark, immersive"),
        world_description=config.get("world_description", "")[:500],
        char_name=char.get("name", "Unknown"),
        mood=char.get("psychology", {}).get("mood", "neutral"),
        stress=char.get("psychology", {}).get("stress_level", 20),
        currencies=json.dumps(char.get("economy", {}).get("currencies", {}), ensure_ascii=False),
        quests_summary=quests_summary,
        abilities_summary=abilities_summary,
        recent_summaries=recent_summaries,
        plot_trigger_instructions=trigger_instructions or "No triggers pending.",
        ability_enforcement=ability_enforcement or "No ability constraints triggered.",
        god_mode_status="ON — Player can do anything, no limits." if is_god_mode else "OFF — Enforce realistic consequences.",
    )

    # ─── 6. Choose LLM ───
    from app.core.llm_factory import get_llm
    llm = get_llm(settings.director_model, temperature=0.5, max_tokens=2048)

    # ─── 7. Single JSON Generation (Optimized for speed) ───
    messages = [
        SystemMessage(content=system_prompt + "\n\nRESPOND WITH ONLY RAW JSON. Do not include markdown formatting or extra text."),
        HumanMessage(content=(
            f"Player's Action:\n{action_context}\n\n"
            f"Based on the above, generate your plan as a valid JSON object matching the requested schema."
        ))
    ]

    try:
        response = await llm.ainvoke(messages)
        raw_plan = response.content if hasattr(response, 'content') else str(response)
        
        # Parse JSON
        import re
        import json as json_lib
        json_match = re.search(r'\{[\s\S]*\}', raw_plan)
        if json_match:
            parsed = json_lib.loads(json_match.group())
            state["director_plan"] = parsed.get("director_plan", "Tạo kế hoạch thất bại.")
            all_activated = list(set(activated_titles + parsed.get("plot_triggers_activated", [])))
            state["plot_triggers_activated"] = all_activated
        else:
            raise ValueError("No JSON found")
            
    except Exception as e:
        print(f"  [DIRECTOR] LLM call or parsing failed: {e}")
        state["director_plan"] = f"Tiếp tục cốt truyện dựa trên hành động: {action_context}."
        state["plot_triggers_activated"] = activated_titles

    state["web_search_results"] = []
    print(f"[DIRECTOR] Plan generated. Triggers: {state['plot_triggers_activated']}")
    return state

