import { useState } from 'react';
import { Group, Avatar, Stack, Text, Box, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import type { Comment } from '@/shared/types';
import { timeAgo } from '@/shared/lib';
import { api } from '@/shared/api';

interface CommentItemProps {
  comment: Comment;
  cardId: number;
  isAdmin?: boolean;
}

export function CommentItem({ comment, cardId, isAdmin = false }: CommentItemProps) {
  const author = comment.author;
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    setDeleting(true);
    try {
      await api.deleteComment(comment.id);
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      notifications.show({ title: 'Success', message: 'Comment deleted', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete comment', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box p="sm" bg="var(--mantine-color-body)" style={{ borderRadius: 12 }}>
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <Avatar
          src={author?.photo_url}
          size="sm"
          radius="xl"
          color="violet"
        >
          {author?.first_name?.[0] || '?'}
        </Avatar>

        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs" justify="space-between">
            <Group gap="xs">
              <Text size="sm" fw={500} c="blue">
                {author?.first_name} {author?.last_name}
              </Text>
              <Text size="xs" c="dimmed">
                {timeAgo(comment.created_at)}
              </Text>
            </Group>
            {isAdmin && (
              <ActionIcon
                size="xs"
                color="red"
                variant="subtle"
                onClick={handleDelete}
                loading={deleting}
              >
                <IconTrash size={12} />
              </ActionIcon>
            )}
          </Group>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}
