import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TelegramAuthData } from '@/shared/types';
import { api } from '@/shared/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoginModalOpen: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (data: TelegramAuthData) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isLoginModalOpen: false,

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      openLoginModal: () => set({ isLoginModalOpen: true }),
      closeLoginModal: () => set({ isLoginModalOpen: false }),

      login: async (data: TelegramAuthData) => {
        try {
          const result = await api.loginWithTelegram(data);
          if (result.ok) {
            const user = await api.getMe();
            set({ user, isLoginModalOpen: false });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } finally {
          set({ user: null });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await api.getMe();
          set({ user });
        } catch {
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
