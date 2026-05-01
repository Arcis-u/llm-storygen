"""
Node 5: Game Master Agent.
Reads the chapter and generates 3 strategic choices for the player.
Uses GPT-4o-mini for speed. Designed to create meaningful dilemmas.
SKIPPED if is_game_over is True (conditional edge in workflow).
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.graph.state import GraphState
from app.core.config import get_settings
from app.models.schemas import StoryChoice


class GameMasterOutput(BaseModel):
    choices: list[StoryChoice] = Field(description="Exactly 3 choices for the player.")


SYSTEM_PROMPT = """You are the Game Master of an interactive RPG. Your job is to present the player with 3 meaningful choices after each chapter.

# THE CHAPTER THAT JUST HAPPENED
{chapter_content}

# PLAYER'S CURRENT STATE
Abilities: {abilities}
Inventory: {inventory}
Active Quests: {quests}

# CHOICE DESIGN PHILOSOPHY
Each choice must feel like a genuine DILEMMA — not just "go left or right."

## Choice 1: THE SAFE PATH (risk_level: "normal")
- Logical, cautious, low-risk. But the reward is also low.
- Example: "Retreat to gather more information."

## Choice 2: THE BOLD GAMBIT (risk_level: "risky")
- Aggressive, daring, high-risk/high-reward.
- Could backfire spectacularly OR lead to a major breakthrough.
- Example: "Confront the enemy leader directly."

## Choice 3: THE WILD CARD (risk_level: "crucial")
- Unconventional, uses a special ability or item, morally ambiguous.
- If the player has a relevant ability or item, reference it in `requires`.
- Example: "Activate your forbidden power — but at what cost?"

# RULES
- BẮT BUỘC: Viết `title` và `description` bằng TIẾNG VIỆT 100%.
- Descriptions should be 1-2 evocative sentences, hinting at consequences without spoiling them.
- If a choice requires a specific item/ability the player HAS, set `requires` to its name. Otherwise, null.
- NEVER offer a choice that is identical to the action the player just took.
"""


async def gamemaster_node(state: GraphState) -> GraphState:
    print("--- NODE 5: GAME MASTER ---")

    # If game is over, return empty choices
    if state.get("is_game_over", False):
        print("[GAME MASTER] Skipped — Game Over.")
        state["choices"] = []
        return state

    settings = get_settings()
    if not (settings.alibaba_api_key or settings.openai_api_key or settings.gemini_api_key or settings.groq_api_key or settings.huggingface_api_key):
        state["choices"] = [
            {"choice_id": 1, "title": "Tiến về phía trước", "description": "Con đường an toàn, nhưng liệu có gì chờ đợi?", "risk_level": "normal", "requires": None},
            {"choice_id": 2, "title": "Lao vào vùng tối", "description": "Nguy hiểm rình rập, nhưng phần thưởng có thể xứng đáng.", "risk_level": "risky", "requires": None},
            {"choice_id": 3, "title": "Kích hoạt sức mạnh ẩn giấu", "description": "Sức mạnh bị cấm — cái giá phải trả là gì?", "risk_level": "crucial", "requires": None}
        ]
        return state

    from app.core.llm_factory import get_llm
    llm = get_llm(settings.gamemaster_model, temperature=0.7)

    config = state["story_config"]
    char = config.get("character", {})

    abilities = ", ".join([a.get("name", "") for a in char.get("abilities", [])]) or "None"
    inventory = ", ".join([it.get("name", "") for it in char.get("economy", {}).get("inventory", [])]) or "Empty"
    quests = ", ".join([q.get("title", "") for q in config.get("quests", []) if q.get("status") == "active"]) or "None"

    prompt_str = SYSTEM_PROMPT.format(
        chapter_content=state.get("chapter_content", "")[:1500],
        abilities=abilities,
        inventory=inventory,
        quests=quests,
    )

    try:
        import json as json_lib
        import re
        messages = [
            SystemMessage(content=prompt_str + '\n\nIMPORTANT: You MUST respond with ONLY a raw JSON object (no markdown, no extra text). The json format is: {"choices": [{"choice_id": 1, "title": "...", "description": "...", "risk_level": "normal|risky|crucial", "requires": null}, ...]}'),
            HumanMessage(content="Generate exactly 3 choices now. Return raw JSON only, no markdown.")
        ]
        response = await llm.ainvoke(messages)
        raw = response.content if hasattr(response, 'content') else str(response)
        
        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw.strip())
        raw = re.sub(r'\s*```$', '', raw.strip())
        
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            parsed = json_lib.loads(json_match.group())
            choices_data = parsed.get("choices", [])
            # Ensure choice_id is set
            for i, c in enumerate(choices_data):
                if "choice_id" not in c:
                    c["choice_id"] = i + 1
            state["choices"] = choices_data[:3]
            print(f"[GAME MASTER] {len(state['choices'])} choices generated.")
        else:
            raise ValueError("No JSON found in response")
    except Exception as e:
        print(f"[GAME MASTER ERROR] Failed: {e}")
        state["choices"] = [
            {"choice_id": 1, "title": "Tiếp tục khám phá", "description": "Tiến về phía trước và xem điều gì sẽ xảy ra.", "risk_level": "normal", "requires": None},
            {"choice_id": 2, "title": "Tìm kiếm manh mối", "description": "Dừng lại và quan sát kỹ xung quanh.", "risk_level": "normal", "requires": None},
            {"choice_id": 3, "title": "Hành động liều lĩnh", "description": "Đặt cược tất cả vào một nước đi táo bạo.", "risk_level": "risky", "requires": None},
        ]

    return state

