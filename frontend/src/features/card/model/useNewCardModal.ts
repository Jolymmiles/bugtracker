import { create } from 'zustand';

interface NewCardModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useNewCardModal = create<NewCardModalState>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
