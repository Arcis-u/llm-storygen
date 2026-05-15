"""
Node 3.5: Critic Agent.
Reviews the Writer's output for logic, grammar, and style errors.
If issues are found, provides feedback and forces the Writer to rewrite.
"""

from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.graph.state import GraphState
from app.core.config import get_settings


class CriticOutput(BaseModel):
    passed: bool = Field(description="True if the chapter is good, False if it needs rewriting.")
    feedback: str = Field(description="If passed is False, explain what needs to be fixed. Otherwise, empty string.")


CRITIC_PROMPT = """You are the Senior Editor (Critic) of a premium interactive fiction game.
Your job is to review the Writer's prose.

# RULES TO CHECK:
1. TONE & STYLE: The prose must be immersive, "show, don't tell". No cheesy clichés.
2. NO SYSTEM MESSAGES: The prose must NOT contain things like "[CÓ/KHÔNG]", "HP: 50", "Yêu cầu 100 Gold".
3. LANGUAGE: Must be 100% Vietnamese.
4. FOURTH WALL: Must not talk directly to the player about game mechanics.
5. LENGTH: Must be reasonably dense (not just 1-2 thin sentences).

# EVALUATION:
If the text violates any rule, set `passed` to False and provide specific `feedback` to the Writer.
If it looks great, set `passed` to True.

# THE TEXT TO REVIEW:
{chapter_content}
"""


async def critic_node(state: GraphState) -> GraphState:
    print("--- NODE 3.5: CRITIC ---")
    
    settings = get_settings()
    if not (settings.alibaba_api_key or settings.openai_api_key or settings.anthropic_api_key or settings.gemini_api_key or settings.groq_api_key):
        state["critic_passed"] = True
        return state

    # Max revisions: 2
    rev_count = state.get("revision_count", 0)
    if rev_count >= 2:
        print("[CRITIC] Max revisions reached. Passing by default.")
        state["critic_passed"] = True
        return state

    from app.core.llm_factory import get_llm
    # Use a fast, cheap model for the critic if possible
    llm = get_llm(settings.director_model, temperature=0.1, max_tokens=500)

    prompt_str = CRITIC_PROMPT.format(
        chapter_content=state.get("chapter_content", "")
    )

    try:
        structured_llm = llm.with_structured_output(CriticOutput)
        messages = [
            SystemMessage(content=prompt_str),
            HumanMessage(content="Evaluate the text now.")
        ]
        response: CriticOutput = await structured_llm.ainvoke(messages)
        
        state["critic_passed"] = response.passed
        state["critic_feedback"] = response.feedback
        state["revision_count"] = rev_count + 1
        
        print(f"[CRITIC] Passed: {response.passed} | Feedback: {response.feedback[:100]}")
        
    except Exception as e:
        print(f"[CRITIC ERROR] {e}. Passing by default.")
        state["critic_passed"] = True
        
    return state
