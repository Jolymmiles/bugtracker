import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { SortType, CardType, StatusType } from '@/shared/types';

export function useCards(params: {
  sort?: SortType;
  type?: CardType;
  status?: StatusType;
  query?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['cards', params],
    queryFn: ({ pageParam = 1 }) =>
      api.getCards({
        ...params,
        page: pageParam,
        limit: pageParam === 1 ? 100 : 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.has_more ? lastPageParam + 1 : undefined,
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
