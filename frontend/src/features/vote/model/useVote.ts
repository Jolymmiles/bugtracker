import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';

export function useVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, value }: { cardId: number; value: number }) =>
      api.vote(cardId, value),
    onSuccess: (updatedCard) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card', updatedCard.id] });
    },
  });
}
