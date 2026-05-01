"""
Node 3: Writer Agent (Premium Prose Engine).
Takes the Director's plan and writes the actual immersive, novel-quality prose.
Uses Claude 3.5 Sonnet for maximum literary quality.
Does NOT handle logic — only crafts beautiful narrative text.
"""

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

from app.graph.state import GraphState
from app.core.config import get_settings


class WriterOutput(BaseModel):
    chapter_title: str = Field(description="A compelling, short title for the chapter (2-6 words).")
    chapter_content: str = Field(description="The full, beautifully written chapter prose.")
    chapter_summary: str = Field(description="A concise 2-3 sentence summary capturing key events and emotional beats.")


SYSTEM_PROMPT = """You are a world-class interactive fiction author. Your writing rivals the best published novels.

# STORY IDENTITY
Genre: {genre}
Tone: {tone}

# DIRECTOR'S PLAN (Follow this EXACTLY)
{director_plan}

# CRAFT GUIDELINES — Follow ALL of these:

## PERSPECTIVE & VOICE
- Write in **second-person present tense** ("You step into the alley...").
- The player IS the protagonist. Make them feel every sensation.

## SHOW, DON'T TELL
- ❌ "You feel scared." → ✅ "Your fingers tremble against the cold metal of the gun. Every shadow feels alive."
- ❌ "The room is dark." → ✅ "Darkness swallows the room whole — only the faint blue glow of a dying screen carves shapes from the void."

## SENSORY IMMERSION (Use ALL five senses)
- What do they SEE? (lighting, colors, movement)
- What do they HEAR? (ambient sounds, dialogue tone, silence)
- What do they SMELL? (environment, chemicals, food, blood)
- What do they FEEL? (temperature, texture, pain, adrenaline)
- What do they TASTE? (if relevant — blood, rain, dust)

## PACING & STRUCTURE
- Create a **chapter title** that feels like a published novel. Keep it short and evocative.
- Open with an **action hook** or **sensory image** — never exposition.
- Use short, punchy sentences for tension. Long, flowing ones for atmosphere.
- End the chapter on a **cliffhanger** or **emotional beat** that makes the player desperate to choose their next action.

## DIALOGUE
- Make NPC dialogue feel natural and distinct. Each character has a unique voice.
- Use subtext — what characters DON'T say is as important as what they do.

## LENGTH
- Write 300-500 words. Dense, impactful, no filler.

## RESTRICTIONS
- BẮT BUỘC: Viết TOÀN BỘ nội dung truyện bằng TIẾNG VIỆT.
- NGHIÊM CẤM: KHÔNG tạo ra các thông báo hệ thống hay giao diện nhắm đến NGƯỜI CHƠI (ví dụ: "[CÓ/KHÔNG]", "Bạn bị trừ 50 Gold", "Yêu cầu 50 Gold").
- NGHIÊM CẤM: KHÔNG viết con số cụ thể kiểu "94%", "87%", "1.000.000 Gold", "HP: 50/100". KHÔNG viết bảng thông số kỹ thuật.
- Thay vì viết "Kiệt sức: 94%" → Hãy viết "Cơ thể gào thét đòi nghỉ ngơi, từng cơ bắp co giật không kiểm soát."
- Thay vì viết "1.000.000 Gold" → Hãy viết "Một con số điên rồ hiện lên trên màn hình — đủ mua cả tòa nhà."
- Truyện là THUẦN VĂN HỌC. Mọi thông tin game (tiền, máu, năng lượng) do hệ thống backend xử lý ngầm.
- Do NOT add choices, options, or meta-commentary at the end.
- Do NOT break the fourth wall.
- NSFW, violence, and dark themes are ALLOWED if the Director's plan calls for them.
"""


async def writer_node(state: GraphState) -> GraphState:
    print("--- NODE 3: WRITER ---")

    settings = get_settings()
    if not (settings.openai_api_key or settings.anthropic_api_key or settings.gemini_api_key or settings.groq_api_key or settings.huggingface_api_key):
        state["chapter_content"] = (
            "[MOCK CHAPTER]\n\n"
            "You step through the threshold. The air shifts — heavier, charged with something you can't name. "
            "Shadows cling to the walls like living things, and somewhere deep in the building, "
            "a rhythmic thumping echoes through the concrete. Your heartbeat matches it. "
            "This was either the best decision of your life, or the last one."
        )
        state["chapter_title"] = "Echoes of the Concrete"
        state["chapter_summary"] = "The character entered a mysterious building and sensed danger."
        return state

    from app.core.llm_factory import get_llm
    llm = get_llm(settings.writer_model, temperature=0.75, max_tokens=2048)

    config = state["story_config"]
    prompt_str = SYSTEM_PROMPT.format(
        genre=config.get("genre", "Fantasy"),
        tone=config.get("tone", "dark, immersive, detailed"),
        director_plan=state.get("director_plan", "No plan provided. Improvise a dramatic scene.")
    )

    try:
        # Try structured output first (works with OpenAI, Gemini)
        structured_llm = llm.with_structured_output(WriterOutput)
        messages = [
            SystemMessage(content=prompt_str),
            HumanMessage(content="Write the chapter now. Make it unforgettable.")
        ]
        response: WriterOutput = await structured_llm.ainvoke(messages)
        state["chapter_title"] = response.chapter_title
        state["chapter_content"] = response.chapter_content
        state["chapter_summary"] = response.chapter_summary
        print(f"[WRITER] Chapter written via structured output ({len(response.chapter_content)} chars)")
    except Exception as e:
        print(f"[WRITER] Structured output failed ({e}), falling back to plain text...")
        try:
            # Fallback: plain text generation (works with all models including HuggingFace)
            messages = [
                SystemMessage(content=prompt_str + "\n\nIMPORTANT: Write the chapter prose directly. At the very end, add a line '---TITLE---' followed by a short title, and then a line '---SUMMARY---' followed by a 2-3 sentence summary."),
                HumanMessage(content="Write the chapter now. Make it unforgettable.")
            ]
            response = await llm.ainvoke(messages)
            raw_text = response.content if hasattr(response, 'content') else str(response)

            # Parse chapter content and summary
            if "---TITLE---" in raw_text and "---SUMMARY---" in raw_text:
                parts = raw_text.split("---TITLE---", 1)
                content = parts[0].strip()
                title_summary = parts[1].split("---SUMMARY---", 1)
                state["chapter_content"] = content
                state["chapter_title"] = title_summary[0].strip()
                state["chapter_summary"] = title_summary[1].strip()
            elif "---SUMMARY---" in raw_text:
                parts = raw_text.split("---SUMMARY---", 1)
                state["chapter_content"] = parts[0].strip()
                state["chapter_title"] = "Chương Mới"
                state["chapter_summary"] = parts[1].strip()
            else:
                state["chapter_content"] = raw_text.strip()
                state["chapter_title"] = "Chương Mới"
                state["chapter_summary"] = raw_text[:200].strip() + "..."
            
            print(f"[WRITER] Chapter written via plain text ({len(state['chapter_content'])} chars)")
        except Exception as e2:
            print(f"[WRITER ERROR] Both methods failed: {e2}")
            state["chapter_content"] = "The world blurs around you. Something happened, but the details escape your grasp..."
            state["chapter_title"] = "Hệ thống Lỗi"
            state["chapter_summary"] = "Error during chapter generation."

    return state

