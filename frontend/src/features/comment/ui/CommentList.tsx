import { useState } from 'react';
import { Stack, Text, Group, Textarea, Button, Box, FileButton, ActionIcon, Image } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useAuth } from '@/features/auth';
import { useCreateComment } from '../model/useComments';
import { CommentItem } from '@/entities/comment';
import { api } from '@/shared/api';
import type { Comment } from '@/shared/types';

interface CommentListProps {
  cardId: number;
  comments: Comment[];
  isAdmin?: boolean;
}

export function CommentList({ cardId, comments, isAdmin = false }: CommentListProps) {
  const { user, openLoginModal } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const createComment = useCreateComment(cardId);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Error',
        message: 'Please select an image file',
        color: 'red',
      });
      return;
    }

    if (file.size > 32 * 1024 * 1024) {
      notifications.show({
        title: 'Error',
        message: 'Image is too large (max 32MB)',
        color: 'red',
      });
      return;
    }

    setUploading(true);

    try {
      const result = await api.uploadImage(file);
      setImages((prev) => [...prev, result.url]);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to upload image',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createComment.mutate(
      { content: content.trim(), images: images.length > 0 ? images : undefined },
      {
        onSuccess: () => {
          setContent('');
          setImages([]);
        },
      }
    );
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
          <Stack gap="xs">
            {images.length > 0 && (
              <Group gap="xs">
                {images.map((url, index) => (
                  <Box key={index} pos="relative" w={50} h={50}>
                    <Image
                      src={url}
                      alt={`Image ${index + 1}`}
                      w={50}
                      h={50}
                      radius="sm"
                      fit="cover"
                    />
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size="xs"
                      pos="absolute"
                      top={-6}
                      right={-6}
                      onClick={() => handleRemoveImage(index)}
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  </Box>
                ))}
              </Group>
            )}
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
              <FileButton onChange={handleFileSelect} accept="image/*">
                {(props) => (
                  <ActionIcon {...props} variant="light" size="lg" loading={uploading}>
                    {uploading ? null : <IconPlus size={18} />}
                  </ActionIcon>
                )}
              </FileButton>
              <Button type="submit" loading={createComment.isPending}>
                Send
              </Button>
            </Group>
          </Stack>
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
