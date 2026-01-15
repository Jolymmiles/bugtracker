import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { SortType, CardType } from '@/shared/types';

export function useCards(params: {
  sort?: SortType;
  type?: CardType;
  status?: string;
  page?: number;
  query?: string;
}) {
  return useQuery({
    queryKey: ['cards', params],
    queryFn: () => api.getCards(params),
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: ['card', id],
    queryFn: () => api.getCard(id),
    enabled: id > 0,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });
}
