import { create } from 'zustand';
import type { SortType, CardType } from '@/shared/types';

interface CardFiltersState {
  sort: SortType;
  type: CardType;
  query: string;
  page: number;
  setSort: (sort: SortType) => void;
  setType: (type: CardType) => void;
  setQuery: (query: string) => void;
  setPage: (page: number) => void;
}

export const useCardFilters = create<CardFiltersState>()((set) => ({
  sort: 'rate',
  type: '',
  query: '',
  page: 1,
  setSort: (sort) => set({ sort, page: 1 }),
  setType: (type) => set({ type, page: 1 }),
  setQuery: (query) => set({ query, page: 1 }),
  setPage: (page) => set({ page }),
}));
