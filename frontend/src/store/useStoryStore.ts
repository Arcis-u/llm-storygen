/**
 * Zustand Store: RPG State Management
 * Manages all character state, quests, relationships, map, and story data.
 * This is the single source of truth for the frontend.
 */

import { create } from 'zustand';

// ============================================================
// Type Definitions (mirrors backend Pydantic models)
// ============================================================

export interface CustomTrait {
  name: string;
  description: string;
  current_value: number;
  max_value: number;
  min_value: number;
  story_impact: string;
}

export interface AbilitySideEffect {
  description: string;
  trait_affected: string;
  impact_amount: number;
  narrative_consequence: string;
}

export interface SpecialAbility {
  name: string;
  description: string;
  origin: string;
  power_level: number;
  side_effects: AbilitySideEffect[];
  cooldown_turns: number;
  last_used_chapter: number;
}

export interface CharacterSkill {
  name: string;
  description: string;
  proficiency: number;
  source: string;
}

export interface PlotTrigger {
  title: string;
  description: string;
  importance: number;
  probability: number;
  earliest_chapter: number;
  triggered: boolean;
  triggered_at_chapter: number | null;
  related_traits: string[];
}

export interface Organization {
  org_id: string;
  name: string;
  type: string;
  is_real_world_based: boolean;
  public_description: string;
  hidden_lore: string;
  join_requirements: Record<string, number>;
  benefits_description: string;
  danger_level: number;
}

export interface FactionRelation {
  org_id: string;
  org_name: string;
  status: string;
  reputation: number;
  rank: string;
}

export interface ShopItem {
  item_id: string;
  name: string;
  category: string;
  price: number;
  currency_type: string;
  is_real_world_item: boolean;
  description: string;
  narrative_impact: string;
  is_consumable: boolean;
  max_durability: number | null;
}

export interface InventoryItem {
  item_id: string;
  name: string;
  quantity: number;
  current_durability: number | null;
}

export interface NPCRelationship {
  npc_name: string;
  npc_title: string;
  tier: string;
  trust: number;
  affection: number;
  hostility: number;
  debt: number;
  notes: string;
  last_interaction_chapter: number;
}

export interface Quest {
  quest_id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'bound' | 'long_term';
  status: 'active' | 'completed' | 'failed' | 'hidden';
  deadline_chapter: number | null;
  reward_hint: string;
  failure_consequence: string;
  assigned_chapter: number;
}

export interface MapLocation {
  location_id: string;
  name: string;
  description: string;
  function: string;
  benefits: string;
  risks: string;
  is_unlocked: boolean;
  is_current: boolean;
  connected_to: string[];
  x_position: number;
  y_position: number;
}

export interface CharacterPsychology {
  current_thoughts: string;
  stress_level: number;
  desires: string[];
  fears: string[];
  mood: string;
}

export interface CharacterEconomy {
  currencies: Record<string, number>;
  inventory: InventoryItem[];
}

export interface CharacterState {
  name: string;
  backstory: string;
  traits: CustomTrait[];
  abilities: SpecialAbility[];
  skills: CharacterSkill[];
  psychology: CharacterPsychology;
  economy: CharacterEconomy;
  relationships: NPCRelationship[];
  factions: FactionRelation[];
}

export interface StoryChoice {
  choice_id: number;
  title: string;
  description: string;
  risk_level: 'normal' | 'risky' | 'crucial';
  requires: string | null;
}

export interface ChapterContent {
  story_id: string;
  chapter_number: number;
  chapter_title?: string;
  content: string;
  summary: string;
  choices: StoryChoice[];
  state_changes: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Store State & Actions
// ============================================================

interface StoryStore {
  // --- Connection ---
  storyId: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;

  // --- Story Phase ---
  phase: 'idle' | 'creating' | 'customizing' | 'playing';

  // --- Character ---
  character: CharacterState;

  // --- Story Content ---
  chapters: ChapterContent[];
  currentChoices: StoryChoice[];

  // --- RPG Systems ---
  quests: Quest[];
  locations: MapLocation[];
  plotTriggers: PlotTrigger[];
  worldOrganizations: Organization[];
  marketItems: ShopItem[];

  // --- Actions ---
  setPhase: (phase: StoryStore['phase']) => void;
  setStoryId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  setCharacter: (character: CharacterState) => void;
  addChapter: (chapter: ChapterContent) => void;
  setCurrentChoices: (choices: StoryChoice[]) => void;
  setQuests: (quests: Quest[]) => void;
  setLocations: (locations: MapLocation[]) => void;
  setPlotTriggers: (triggers: PlotTrigger[]) => void;
  setWorldOrganizations: (orgs: Organization[]) => void;
  setMarketItems: (items: ShopItem[]) => void;
  
  updateFullState: (data: {
    chapter: ChapterContent;
    character: CharacterState;
    quests: Quest[];
    locations: MapLocation[];
  }) => void;
  resetStore: () => void;
}

const initialCharacter: CharacterState = {
  name: '',
  backstory: '',
  traits: [],
  abilities: [],
  psychology: {
    current_thoughts: '',
    stress_level: 20,
    desires: [],
    fears: [],
    mood: 'neutral',
  },
  economy: {
    currencies: { "Gold": 100 },
    inventory: [],
  },
  relationships: [],
  factions: [],
};

export const useStoryStore = create<StoryStore>((set) => ({
  storyId: null,
  isLoading: false,
  isProcessing: false,
  error: null,
  phase: 'idle',
  character: initialCharacter,
  chapters: [],
  currentChoices: [],
  quests: [],
  locations: [],
  plotTriggers: [],
  worldOrganizations: [],
  marketItems: [],

  setPhase: (phase) => set({ phase }),
  setStoryId: (id) => set({ storyId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setError: (error) => set({ error }),
  setCharacter: (character) => set({ character }),

  addChapter: (chapter) =>
    set((state) => ({
      chapters: [...state.chapters, chapter],
      currentChoices: chapter.choices,
    })),

  setCurrentChoices: (currentChoices) => set({ currentChoices }),
  setQuests: (quests) => set({ quests }),
  setLocations: (locations) => set({ locations }),
  setPlotTriggers: (plotTriggers) => set({ plotTriggers }),
  setWorldOrganizations: (worldOrganizations) => set({ worldOrganizations }),
  setMarketItems: (marketItems) => set({ marketItems }),

  updateFullState: (data) =>
    set((state) => ({
      chapters: [...state.chapters, data.chapter],
      currentChoices: data.chapter.choices,
      character: data.character,
      quests: data.quests,
      locations: data.locations,
      worldOrganizations: (data as Record<string, unknown>).organizations as Organization[] || state.worldOrganizations,
      marketItems: (data as Record<string, unknown>).shop_items as ShopItem[] || state.marketItems,
      plotTriggers: (data as Record<string, unknown>).plot_triggers as PlotTrigger[] || state.plotTriggers,
      isLoading: false,
      isProcessing: false,
    })),

  resetStore: () =>
    set({
      storyId: null,
      isLoading: false,
      error: null,
      phase: 'idle',
      character: initialCharacter,
      chapters: [],
      currentChoices: [],
      quests: [],
      locations: [],
      plotTriggers: [],
      worldOrganizations: [],
      marketItems: [],
    }),
}));
