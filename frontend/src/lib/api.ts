/**
 * API Client: Centralized HTTP calls to the FastAPI backend.
 * All endpoints return typed data matching the Zustand store.
 */

import axios from 'axios';

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

export async function streamAction(
  data: {
    story_id: string;
    action_type: 'choice' | 'custom' | 'move';
    choice_id?: number;
    custom_action?: string;
    target_location_id?: string;
    dice_result?: number;
  },
  onToken: (token: string) => void,
  onComplete: (chapter: any, config: any) => void,
  onError: (error: string) => void
) {
  try {
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_BASE}/api/story/stream-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          if (!jsonStr.trim()) continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'token') {
              onToken(parsed.text);
            } else if (parsed.type === 'done') {
              onComplete(parsed.chapter, parsed.config);
            } else if (parsed.type === 'error') {
              onError(parsed.message);
            }
          } catch (e) {
            console.error("Error parsing SSE JSON:", e, jsonStr);
          }
        }
      }
    }
  } catch (err: any) {
    onError(err.message || "Streaming failed");
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
