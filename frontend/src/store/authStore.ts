import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  user_id: string;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null });
        // Optional: clear other stores or redirect
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },
      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage', // unique name for localStorage
    }
  )
);
