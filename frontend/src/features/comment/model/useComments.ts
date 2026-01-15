import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';

export function useCreateComment(cardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => api.createComment(cardId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });
}
