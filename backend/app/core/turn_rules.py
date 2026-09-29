"""Authoritative action validation, narrative approach and decision records."""
import secrets
from fastapi import HTTPException
from app.models.schemas import StoryConfig

APPROACHES = {
    "balanced": "Act pragmatically; weigh opportunities and consequences.",
    "careful": "Prioritize observation, preparation and avoiding unnecessary danger. Caution may take time; it does not guarantee success.",
    "bold": "Act decisively and accept exposure to danger. Boldness does not grant extra power or automatic success.",
}


def prepare_action(request, story: dict, previous: dict):
    config = StoryConfig(**story)
    if config.is_ended or config.character.hp <= 0:
        raise HTTPException(409, "Hành trình đã kết thúc. Bạn vẫn có thể đọc lại các chương.")
    if request.expected_chapter is not None and request.expected_chapter != config.current_chapter:
        raise HTTPException(409, "Chương truyện đã thay đổi. Hãy tải lại trước khi chọn tiếp.")
    resolved = request.model_copy(update={"dice_result": None})
    risk = "normal"
    if request.action_type == "choice":
        choice = next((c for c in previous.get("choices", []) if c["choice_id"] == request.choice_id), None)
        if not choice:
            raise HTTPException(422, "Lựa chọn không còn tồn tại trong chương hiện tại.")
        label = choice["title"]
        detail = choice.get("description", "")
        risk = choice.get("risk_level", "normal")
        if risk in {"risky", "crucial"}:
            resolved.dice_result = secrets.randbelow(20) + 1
        context = f"Player chose: {label}. {detail}"
        if choice.get("requires"):
            context += f" Required condition: {choice['requires']}. Verify against the character state; do not assume it is satisfied."
    elif request.action_type == "custom":
        label = (request.custom_action or "").strip()
        if not label:
            raise HTTPException(422, "Hãy nhập hành động của bạn.")
        context = f"Player attempts: {label}. Judge feasibility from the actual character and world state."
    elif request.action_type == "move":
        target_id = request.target_location_id or request.custom_action
        target = next((loc for loc in config.locations if loc.location_id == target_id), None)
        current = next((loc for loc in config.locations if loc.is_current), None)
        if not target or not target.is_unlocked:
            raise HTTPException(422, "Địa điểm này chưa được mở khóa.")
        if target.is_current:
            raise HTTPException(422, "Bạn đang ở địa điểm này.")
        if current and current.connected_to and target.location_id not in current.connected_to:
            raise HTTPException(422, "Chưa có đường nối trực tiếp tới địa điểm này.")
        label = f"Di chuyển tới {target.name}"
        context = f"Player travels to {target.name} ({target.location_id}). {target.description}. Risks: {target.risks}. Describe the journey and arrival."
    else:
        raise HTTPException(422, "Hành động không được hỗ trợ trong lượt truyện.")
    context += f"\nAPPROACH: {APPROACHES[request.approach]} This is narrative intent, not a stat bonus."
    if resolved.dice_result:
        dice = resolved.dice_result
        outcome = "critical failure" if dice == 1 else "failure" if dice < 10 else "critical success" if dice == 20 else "success"
        context += f"\nSERVER D20: {dice}/20 — {outcome}. Resolve consequences proportionally to the established stakes; never invent unrelated punishment or rewards."
    decision = {"label": label, "action_type": request.action_type, "approach": request.approach, "risk_level": risk, "dice_result": resolved.dice_result}
    return resolved, context, decision


def initial_turn_state(story, request, context, previous=None):
    return dict(story_config=story, player_action=request.model_dump(), action_context=context,
                chapter_number=story.get("current_chapter", 0) + 1,
                is_god_mode=story.get("is_god_mode", False),
                relevant_memories=["Most recent chapter: " + (previous.get("summary") or previous.get("content", "")[-2500:])] if previous else [],
                director_plan="", web_search_results=[], plot_triggers_activated=[],
                chapter_title="", chapter_content="", chapter_summary="", tone="ambient",
                critic_feedback="", critic_passed=True, revision_count=0,
                state_changes={}, is_game_over=False, choices=[], error=None)
