import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';

interface CreateCommentInput {
  content: string;
  images?: string[];
}

export function useCreateComment(cardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, images }: CreateCommentInput) => api.createComment(cardId, content, images),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
    },
  });
}
