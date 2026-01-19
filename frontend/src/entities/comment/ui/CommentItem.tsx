import { useState, useMemo } from 'react';
import { Group, Avatar, Stack, Text, Box, ActionIcon, Image } from '@mantine/core';
import { IconTrash, IconPlayerPlay, IconFile } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import type { Comment } from '@/shared/types';
import { timeAgo } from '@/shared/lib';
import { api } from '@/shared/api';
import { MediaModal, type MediaItem } from '@/shared/ui';

interface CommentItemProps {
  comment: Comment;
  cardId: number;
  isAdmin?: boolean;
}

export function CommentItem({ comment, cardId, isAdmin = false }: CommentItemProps) {
  const author = comment.author;
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaInitialIndex, setMediaInitialIndex] = useState(0);

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  };

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i);
  };

  const isMediaUrl = (url: string) => isImageUrl(url) || isVideoUrl(url);

  const mediaItems: MediaItem[] = useMemo(() => {
    if (!comment.images) return [];
    return comment.images.filter(isMediaUrl).map((url) => ({ url }));
  }, [comment.images]);

  const handleFileClick = (url: string) => {
    if (isMediaUrl(url)) {
      const mediaIndex = mediaItems.findIndex((item) => item.url === url);
      if (mediaIndex !== -1) {
        setMediaInitialIndex(mediaIndex);
        setMediaModalOpen(true);
      }
    } else {
      window.open(url, '_blank');
    }
  };

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
          {comment.images && comment.images.length > 0 && (
            <Group gap="xs" mt="xs">
              {comment.images.map((url, index) => (
                <Box
                  key={index}
                  w={60}
                  h={60}
                  pos="relative"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleFileClick(url)}
                >
                  {isImageUrl(url) ? (
                    <Image
                      src={url}
                      alt={`Image ${index + 1}`}
                      w={60}
                      h={60}
                      radius="sm"
                      fit="cover"
                    />
                  ) : isVideoUrl(url) ? (
                    <Box
                      w={60}
                      h={60}
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                        background: 'var(--mantine-color-dark-6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconPlayerPlay size={24} color="white" />
                    </Box>
                  ) : (
                    <Box
                      w={60}
                      h={60}
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                        background: 'var(--mantine-color-dark-6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconFile size={24} color="white" />
                    </Box>
                  )}
                </Box>
              ))}
            </Group>
          )}
        </Stack>
      </Group>

      <MediaModal
        items={mediaItems}
        initialIndex={mediaInitialIndex}
        opened={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
      />
    </Box>
  );
}
