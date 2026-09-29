/**
 * API Client: Centralized HTTP calls to the FastAPI backend.
 * All endpoints return typed data matching the Zustand store.
 */

import axios from 'axios';
import type { ChapterContent, StoryConfig } from '@/store/useStoryStore';
import { consumeStoryStream } from './story-stream';

import { useAuthStore } from '../store/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 600000, // 10 minutes - pipeline runs 4 LLM agents sequentially with heavy models
});

// Request Interceptor: Attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and logout if token is invalid/expired
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

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

// --- Gameplay Turn (Narrative Only) ---
export async function submitAction(data: {
  story_id: string;
  action_type: 'choice' | 'custom' | 'move';
  choice_id?: number;
  custom_action?: string;
  target_location_id?: string;
  dice_result?: number;
}) {
  const response = await api.post('/api/story/turn', data);
  return response.data;
}

export type TurnAction = {
  story_id: string; action_type: 'choice' | 'custom' | 'move';
  choice_id?: number; custom_action?: string; target_location_id?: string;
  dice_result?: number; expected_chapter?: number; approach?: 'balanced' | 'careful' | 'bold';
};
export async function streamAction(
  data: TurnAction,
  onToken: (token: string) => void,
  onComplete: (chapter: ChapterContent, config: StoryConfig) => void,
  onError: (error: string) => void,
  options: { signal?: AbortSignal; onStatus?: (message:string) => void; onReplace?: (text:string) => void; onRoll?: (value:number) => void } = {},
) {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE}/api/story/stream-turn`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data), signal: options.signal,
    });
    if (response.status === 401) useAuthStore.getState().logout();
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => null);
      throw new Error(typeof error?.detail === 'string' ? error.detail : `Không thể xử lý yêu cầu (${response.status}).`);
    }
    await consumeStoryStream(response.body, {
      token: onToken, replace: options.onReplace || onToken, status: options.onStatus || (() => {}),
      done: onComplete, roll: options.onRoll,
    });
  } catch (err) {
    if (options.signal?.aborted) return;
    onError(err instanceof Error ? err.message : 'Kết nối bị gián đoạn. Hãy tải lại để kiểm tra tiến trình.');
  }
}

// --- Instant Actions (System UI, No AI) ---
export async function submitInstantAction(data: {
  story_id: string;
  action_type: string;
  item_id?: string;
}) {
  const response = await api.post('/api/story/action/instant', data);
  return response.data;
}

export async function submitCraftAction(data: {
  story_id: string;
  item_id_1: string;
  item_id_2: string;
}) {
  const response = await api.post('/api/story/action/craft', data);
  return response.data;
}

// --- Intent Actions (Psychology, Delayed AI) ---
export async function submitIntent(data: {
  story_id: string;
  intent_type: string;
  target_name: string;
  target_id?: string;
}) {
  const response = await api.post('/api/story/action/intent', data);
  return response.data;
}

// --- Story Settings ---
export async function updateStorySettings(storyId: string, data: {
  title?: string;
  cover_image?: string;
}) {
  const response = await api.put(`/api/story/${storyId}/settings`, data);
  return response.data;
}

// --- Start Story (Generate Opening Chapter) ---
export async function startStory(storyId: string) {
  const response = await api.post(`/api/story/start/${storyId}`);
  return response.data;
}

export async function deleteStory(storyId: string) {
  const response = await api.delete(`/api/story/${storyId}`);
  return response.data;
}

// --- Auth ---
export async function login(data: any) {
  const response = await api.post('/api/auth/login', data);
  return response.data;
}

export async function register(data: any) {
  const response = await api.post('/api/auth/register', data);
  return response.data;
}

export async function getMe() {
  const response = await api.get('/api/auth/me');
  return response.data;
}

export async function getMyStories() {
  const response = await api.get('/api/story/user/me');
  return response.data;
}

// --- Admin ---
export async function getAdminStats() {
  const response = await api.get('/api/admin/stats');
  return response.data;
}

export async function getAdminUsers() {
  const response = await api.get('/api/admin/users');
  return response.data;
}

export async function deleteUser(userId: string) {
  const response = await api.delete(`/api/admin/users/${userId}`);
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
