import { useState } from 'react';
import { Stack, Text, Group, Textarea, Button, Box } from '@mantine/core';
import { useAuth } from '@/features/auth';
import { useCreateComment } from '../model/useComments';
import { CommentItem } from '@/entities/comment';
import type { Comment } from '@/shared/types';

interface CommentListProps {
  cardId: number;
  comments: Comment[];
  isAdmin?: boolean;
}

export function CommentList({ cardId, comments, isAdmin = false }: CommentListProps) {
  const { user, openLoginModal } = useAuth();
  const [content, setContent] = useState('');
  const createComment = useCreateComment(cardId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createComment.mutate(content.trim(), {
      onSuccess: () => setContent(''),
    });
  };

  return (
    <Box p="md" bg="var(--mantine-color-default-hover)" style={{ borderRadius: '0 0 16px 16px', margin: '-24px', marginTop: '24px' }}>
      <Group gap="xs" mb="md">
        <Text fw={500}>Comments</Text>
        <Text size="sm" c="dimmed">
          {comments.length}
        </Text>
      </Group>

      <Stack gap="sm" mb="md">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} cardId={cardId} isAdmin={isAdmin} />
        ))}
        {comments.length === 0 && (
          <Text c="dimmed" ta="center" py="md">
            No comments yet
          </Text>
        )}
      </Stack>

      {user ? (
        <form onSubmit={handleSubmit}>
          <Group align="flex-end" gap="sm">
            <Textarea
              placeholder="Write a comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ flex: 1 }}
              autosize
              minRows={1}
              maxRows={4}
            />
            <Button type="submit" loading={createComment.isPending}>
              Send
            </Button>
          </Group>
        </form>
      ) : (
        <Text c="dimmed" ta="center" py="md">
          <Text
            component="span"
            c="blue"
            style={{ cursor: 'pointer' }}
            onClick={openLoginModal}
          >
            Login
          </Text>{' '}
          to leave a comment
        </Text>
      )}
    </Box>
  );
}
