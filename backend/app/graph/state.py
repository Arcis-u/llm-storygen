from typing import TypedDict, Optional

class GraphState(TypedDict):
    # --- INPUT ---
    story_config: dict          # Current StoryConfig as dict
    player_action: dict         # PlayerActionRequest as dict
    action_context: str         # Pre-processed description of what the player did (built by API layer)

    # --- MEMORY ---
    relevant_memories: list[str]

    # --- DIRECTOR OUTPUT ---
    director_plan: str
    web_search_results: list[str]
    plot_triggers_activated: list[str]  # Titles of triggers that fired this turn

    # --- WRITER OUTPUT ---
    chapter_title: str
    chapter_content: str
    chapter_summary: str

    # --- EDITOR OUTPUT ---
    state_changes: dict         # The JSON diff
    is_game_over: bool          # True if character died or story ended

    # --- GAMEMASTER OUTPUT ---
    choices: list[dict]         # List of StoryChoice as dicts

    # --- METADATA ---
    chapter_number: int
    is_god_mode: bool           # If True, skip plausibility checks
    error: Optional[str]
