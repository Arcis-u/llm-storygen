/**
 * API Client: Centralized HTTP calls to the FastAPI backend.
 * All endpoints return typed data matching the Zustand store.
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 600000, // 10 minutes - pipeline runs 4 LLM agents sequentially with heavy models
});

// --- Story Creation ---
export async function createStory(data: {
  genre: string;
  world_description: string;
  character_name: string;
  character_backstory?: string;
  tone?: string;
  nsfw_enabled?: boolean;
  is_god_mode?: boolean;
  starting_gold?: number;
}) {
  const response = await api.post('/api/story/create', data);
  return response.data;
}

// --- Pre-game Customization ---
export async function customizeStory(data: {
  story_id: string;
  traits?: unknown[];
  abilities?: unknown[];
  skills?: unknown[];
  plot_triggers?: unknown[];
  locations?: unknown[];
}) {
  const response = await api.put('/api/story/customize', data);
  return response.data;
}

// --- Gameplay Turn ---
export async function submitAction(data: {
  story_id: string;
  action_type: 'choice' | 'custom' | 'move' | 'buy_item' | 'join_faction';
  choice_id?: number;
  custom_action?: string;
  target_location_id?: string;
  item_id?: string;
  org_id?: string;
}) {
  const response = await api.post('/api/story/turn', data);
  return response.data;
}

// --- Start Story (Generate Opening Chapter) ---
export async function startStory(storyId: string) {
  const response = await api.post(`/api/story/start/${storyId}`);
  return response.data;
}

// --- Get Full State ---
export async function getStoryState(storyId: string) {
  const response = await api.get(`/api/story/state/${storyId}`);
  return response.data;
}

// --- Get All Chapters ---
export async function getAllChapters(storyId: string) {
  const response = await api.get(`/api/story/chapters/${storyId}`);
  return response.data;
}

// --- Health Check ---
export async function healthCheck() {
  const response = await api.get('/health');
  return response.data;
}

// --- Search Faction ---
export async function searchFaction(data: { story_id: string; query: string }) {
  const response = await api.post('/api/story/factions/search', data);
  return response.data;
}

export default api;
