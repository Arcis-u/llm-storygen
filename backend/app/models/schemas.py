"""
Pydantic models for the entire RPG State system.
These models define the shape of all data flowing through the application:
story configuration, character state, relationships, quests, map, chapters, organizations, and economy.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================

class QuestPriority(str, Enum):
    URGENT = "urgent"           # Must resolve within X turns
    BOUND = "bound"             # Tied to abilities / world rules
    LONG_TERM = "long_term"     # Life goals of the character


class QuestStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    HIDDEN = "hidden"           # Not yet revealed to the player


class RelationshipTier(str, Enum):
    STRANGER = "stranger"
    ACQUAINTANCE = "acquaintance"
    FRIEND = "friend"
    CLOSE = "close"
    INTIMATE = "intimate"
    RIVAL = "rival"
    ENEMY = "enemy"


# ============================================================
# Sub-models: Character Traits & Abilities
# ============================================================

class CustomTrait(BaseModel):
    """
    A user-defined special stat that influences the story.
    Example: 'Soul Corruption Level', 'Curse Pressure', 'Bond with the Ancient God'.
    """
    name: str
    description: str
    current_value: float = Field(default=0.0, description="Current numeric value")
    max_value: float = Field(default=100.0)
    min_value: float = Field(default=0.0)
    story_impact: str = Field(
        default="",
        description="How this trait affects the narrative when it changes"
    )


class AbilitySideEffect(BaseModel):
    """Defines the cost or consequence of using a special ability."""
    description: str
    trait_affected: str = Field(default="", description="Which CustomTrait is impacted")
    impact_amount: float = Field(default=0.0, description="How much the trait changes per use")
    narrative_consequence: str = Field(
        default="",
        description="Story-level description of what happens (e.g., 'Loses a precious memory')"
    )


class SpecialAbility(BaseModel):
    """A character's special power with origin and side effects."""
    name: str
    description: str
    origin: str = Field(default="", description="Where did this power come from?")
    power_level: int = Field(default=1, ge=1, le=10)
    side_effects: list[AbilitySideEffect] = Field(default_factory=list)
    cooldown_turns: int = Field(default=0, description="Turns before ability can be reused")
    last_used_chapter: int = Field(default=0)


# ============================================================
# Sub-models: Plot Triggers (Story Constraints)
# ============================================================

class PlotTrigger(BaseModel):
    """
    A future event / plot point the user defines during Pre-game.
    The Director Agent MUST reference these when planning chapters.
    """
    title: str
    description: str
    importance: int = Field(default=5, ge=1, le=10, description="1=minor flavor, 10=critical arc")
    probability: float = Field(
        default=0.5, ge=0.0, le=1.0,
        description="Likelihood of occurring (0.0-1.0)"
    )
    earliest_chapter: int = Field(default=1, description="Cannot trigger before this chapter")
    triggered: bool = Field(default=False)
    triggered_at_chapter: Optional[int] = None
    related_traits: list[str] = Field(
        default_factory=list,
        description="Names of CustomTraits that influence this trigger"
    )


# ============================================================
# Sub-models: Organizations & Factions
# ============================================================

class Organization(BaseModel):
    """
    A faction, company, or institution in the world.
    80% real-world data, 20% fictional lore integration.
    """
    org_id: str
    name: str
    type: str = Field(description="e.g., government, academic, corporate, underworld, religious")
    is_real_world_based: bool = Field(
        default=False, 
        description="If True, AI will use Web Search to gather factual data about it."
    )
    public_description: str = Field(default="", description="Public knowledge (can be factual if real)")
    hidden_lore: str = Field(default="", description="Fictional secrets tied to the story")
    join_requirements: dict[str, int] = Field(
        default_factory=dict, 
        description="Stat or trait thresholds needed to join"
    )
    benefits_description: str = Field(default="")
    danger_level: int = Field(default=1, ge=1, le=10)


class FactionRelation(BaseModel):
    """Character's relationship with a specific Organization."""
    org_id: str
    org_name: str
    status: str = Field(default="unaware", description="unaware, known, member, leader, enemy")
    reputation: int = Field(default=0, ge=-100, le=100, description="Reputation score with this faction")
    rank: str = Field(default="", description="Title or rank within the organization")


# ============================================================
# Sub-models: Shop & Inventory
# ============================================================

class ShopItem(BaseModel):
    """An item available for purchase in the Marketplace."""
    item_id: str
    name: str
    category: str = Field(description="e.g., real_estate, vehicle, weapon, consumable, black_market, tech")
    price: float
    currency_type: str = Field(default="standard", description="Dynamic currency based on prompt (e.g., gold, usd, crystals)")
    is_real_world_item: bool = Field(
        default=False, 
        description="If True, AI references real-world pricing/specs via Web Search."
    )
    description: str
    narrative_impact: str = Field(default="", description="How this item influences the story upon purchase")
    is_consumable: bool = Field(default=False)
    max_durability: Optional[int] = Field(default=None)


class InventoryItem(BaseModel):
    """An item currently owned by the character."""
    item_id: str
    name: str
    quantity: int = Field(default=1)
    current_durability: Optional[int] = Field(default=None)


# ============================================================
# Sub-models: Relationships
# ============================================================

class NPCRelationship(BaseModel):
    """Detailed relationship state with a specific NPC."""
    npc_name: str
    npc_title: str = Field(default="", description="E.g., 'The Blacksmith', 'Shadow Priestess'")
    tier: RelationshipTier = Field(default=RelationshipTier.STRANGER)
    trust: float = Field(default=50.0, ge=0.0, le=100.0)
    affection: float = Field(default=50.0, ge=0.0, le=100.0)
    hostility: float = Field(default=0.0, ge=0.0, le=100.0)
    debt: float = Field(default=0.0, description="Positive=they owe you, Negative=you owe them")
    notes: str = Field(default="", description="AI-generated summary of key interactions")
    last_interaction_chapter: int = Field(default=0)


# ============================================================
# Sub-models: Quests
# ============================================================

class Quest(BaseModel):
    """A quest/mission in the story."""
    quest_id: str
    title: str
    description: str
    priority: QuestPriority = Field(default=QuestPriority.LONG_TERM)
    status: QuestStatus = Field(default=QuestStatus.ACTIVE)
    deadline_chapter: Optional[int] = Field(
        default=None,
        description="If URGENT, must be resolved by this chapter"
    )
    reward_hint: str = Field(default="", description="What the player might gain")
    failure_consequence: str = Field(default="", description="What happens if the player fails")
    assigned_chapter: int = Field(default=1)


# ============================================================
# Sub-models: Map
# ============================================================

class MapLocation(BaseModel):
    """A notable location on the interactive map."""
    location_id: str
    name: str
    description: str
    function: str = Field(default="", description="What can the player DO here?")
    benefits: str = Field(default="", description="Benefits of visiting")
    risks: str = Field(default="", description="Dangers or costs")
    is_unlocked: bool = Field(default=True)
    is_current: bool = Field(default=False)
    connected_to: list[str] = Field(
        default_factory=list,
        description="IDs of locations directly reachable from here"
    )
    x_position: float = Field(default=0.0, description="X coordinate for map rendering")
    y_position: float = Field(default=0.0, description="Y coordinate for map rendering")


# ============================================================
# Sub-models: Character Current State (Psychology / Economy)
# ============================================================

class CharacterPsychology(BaseModel):
    """The character's current mental/emotional state."""
    current_thoughts: str = Field(
        default="",
        description="What is the character currently thinking about?"
    )
    stress_level: float = Field(default=20.0, ge=0.0, le=100.0)
    desires: list[str] = Field(
        default_factory=list,
        description="Current desires or motivations"
    )
    fears: list[str] = Field(
        default_factory=list,
        description="Current fears or anxieties"
    )
    mood: str = Field(default="neutral", description="E.g., 'anxious', 'determined', 'aroused'")


class CharacterEconomy(BaseModel):
    """The character's financial/resource state."""
    currencies: dict[str, float] = Field(
        default_factory=lambda: {"Gold": 100.0},
        description="Dynamic multi-currency system (e.g., {'USD': 500, 'Mana Crystals': 10})"
    )
    inventory: list[InventoryItem] = Field(
        default_factory=list,
        description="List of purchased/acquired items"
    )


# ============================================================
# Top-level Models
# ============================================================

class CharacterSkill(BaseModel):
    """A specific skill the character has learned."""
    name: str
    description: str
    proficiency: int = Field(default=1, ge=1, le=100)
    source: str = Field(default="", description="How it was learned (e.g., 'Military training')")


class CharacterState(BaseModel):
    """The complete current state of the player character."""
    name: str
    backstory: str = ""
    traits: list[CustomTrait] = Field(default_factory=list)
    abilities: list[SpecialAbility] = Field(default_factory=list)
    skills: list[CharacterSkill] = Field(default_factory=list)
    psychology: CharacterPsychology = Field(default_factory=CharacterPsychology)
    economy: CharacterEconomy = Field(default_factory=CharacterEconomy)
    relationships: list[NPCRelationship] = Field(default_factory=list)
    factions: list[FactionRelation] = Field(default_factory=list)


class StoryConfig(BaseModel):
    """
    The complete configuration for a story, set during World Setup + Pre-game Customization.
    This is the 'blueprint' that all AI agents reference.
    """
    story_id: str = Field(default="")
    user_id: str = Field(default="anonymous")
    title: str = Field(default="Untitled Story")
    genre: str = Field(default="Fantasy")
    world_description: str = Field(default="")
    tone: str = Field(default="dark, immersive, detailed")
    nsfw_enabled: bool = Field(default=True)

    # Character setup
    character: CharacterState = Field(default_factory=CharacterState)

    # Plot triggers (Pre-game constraints)
    plot_triggers: list[PlotTrigger] = Field(default_factory=list)

    # Map
    locations: list[MapLocation] = Field(default_factory=list)

    # Quests
    quests: list[Quest] = Field(default_factory=list)

    # Organizations & Shop
    available_organizations: list[Organization] = Field(default_factory=list)
    available_shop_items: list[ShopItem] = Field(default_factory=list)

    # Game Settings
    is_god_mode: bool = Field(default=False, description="If True, disable plausibility checks. Player can do anything.")
    is_ended: bool = Field(default=False, description="If True, the story has ended (Game Over).")

    # Metadata
    current_chapter: int = Field(default=0)
    total_turns: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class StoryChoice(BaseModel):
    """One of the 3 choices presented to the player by Game Master Agent."""
    choice_id: int = Field(ge=1, le=3)
    title: str
    description: str
    risk_level: str = Field(default="normal", description="normal / risky / crucial")
    requires: Optional[str] = Field(
        default=None,
        description="Item or ability required, if any"
    )


class ChapterContent(BaseModel):
    """The output of a single story turn/chapter."""
    story_id: str
    chapter_number: int
    chapter_title: str = Field(default="", description="A short, evocative title for the chapter")
    content: str = Field(description="The full chapter text")
    summary: str = Field(default="", description="AI-generated summary for memory storage")
    choices: list[StoryChoice] = Field(default_factory=list)
    state_changes: dict = Field(
        default_factory=dict,
        description="JSON diff of what changed in CharacterState after this chapter"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# API Request/Response models
# ============================================================

class CreateStoryRequest(BaseModel):
    """Request body for creating a new story (Initial prompt phase)."""
    genre: str
    world_description: str
    character_name: str
    character_backstory: str = ""
    tone: str = "dark, immersive, detailed"
    nsfw_enabled: bool = True
    is_god_mode: bool = False
    starting_gold: float = 100


class CustomizeStoryRequest(BaseModel):
    """Request body for Pre-game Customization phase."""
    story_id: str
    traits: list[CustomTrait] = Field(default_factory=list)
    abilities: list[SpecialAbility] = Field(default_factory=list)
    skills: list[CharacterSkill] = Field(default_factory=list)
    plot_triggers: list[PlotTrigger] = Field(default_factory=list)
    locations: list[MapLocation] = Field(default_factory=list)


class SearchFactionRequest(BaseModel):
    """Request body for querying and dynamically adding a faction."""
    story_id: str
    query: str



class PlayerActionRequest(BaseModel):
    """Request body when the player makes a decision."""
    story_id: str
    action_type: str = Field(
        default="choice",
        description="'choice', 'custom', 'move', 'buy_item', 'join_faction'"
    )
    choice_id: Optional[int] = Field(default=None)
    custom_action: Optional[str] = Field(default=None)
    target_location_id: Optional[str] = Field(default=None)
    item_id: Optional[str] = Field(default=None)
    org_id: Optional[str] = Field(default=None)


class StoryStateResponse(BaseModel):
    """Full state response sent to the frontend after each turn."""
    story_id: str
    chapter: ChapterContent
    config: Optional[StoryConfig] = None


# ============================================================
# Rebuild all models to resolve forward references
# (Required because of `from __future__ import annotations`)
# ============================================================
CharacterState.model_rebuild()
StoryConfig.model_rebuild()
StoryStateResponse.model_rebuild()
