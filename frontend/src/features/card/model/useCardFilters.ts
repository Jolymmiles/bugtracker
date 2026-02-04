import { create } from 'zustand';
import type { SortType, CardType, StatusType } from '@/shared/types';

interface CardFiltersState {
  sort: SortType;
  type: CardType;
  status: StatusType;
  query: string;
  mine: boolean;
  setSort: (sort: SortType) => void;
  setType: (type: CardType) => void;
  setStatus: (status: StatusType) => void;
  setQuery: (query: string) => void;
  setMine: (mine: boolean) => void;
}

export const useCardFilters = create<CardFiltersState>()((set) => ({
  sort: 'rate',
  type: '',
  status: 'open',
  query: '',
  mine: false,
  setSort: (sort) => set({ sort }),
  setType: (type) => set({ type }),
  setStatus: (status) => set({ status }),
  setQuery: (query) => set({ query }),
  setMine: (mine) => set({ mine }),
}));
