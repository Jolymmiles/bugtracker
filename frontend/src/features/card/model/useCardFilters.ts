import { create } from 'zustand';
import type { SortType, CardType, StatusType } from '@/shared/types';

interface CardFiltersState {
  sort: SortType;
  type: CardType;
  status: StatusType;
  query: string;
  setSort: (sort: SortType) => void;
  setType: (type: CardType) => void;
  setStatus: (status: StatusType) => void;
  setQuery: (query: string) => void;
}

export const useCardFilters = create<CardFiltersState>()((set) => ({
  sort: 'rate',
  type: '',
  status: 'open',
  query: '',
  setSort: (sort) => set({ sort }),
  setType: (type) => set({ type }),
  setStatus: (status) => set({ status }),
  setQuery: (query) => set({ query }),
}));
