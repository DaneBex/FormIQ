import { create } from 'zustand';

export interface AppUser {
  id: string;
  email?: string;
  displayName?: string;
}

interface UserState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
