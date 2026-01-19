import { useState } from 'react';
import { Stack, Text, Group, Textarea, Button, Box, FileButton, ActionIcon, Image } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconX, IconPlayerPlay, IconFile } from '@tabler/icons-react';
import { useAuth } from '@/features/auth';
import { useCreateComment } from '../model/useComments';
import { CommentItem } from '@/entities/comment';
import { api } from '@/shared/api';
import type { Comment, Attachment } from '@/shared/types';

interface CommentListProps {
  cardId: number;
  comments: Comment[];
  isAdmin?: boolean;
}

export function CommentList({ cardId, comments, isAdmin = false }: CommentListProps) {
  const { user, openLoginModal } = useAuth();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const createComment = useCreateComment(cardId);

  const handleFilesSelect = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (file.size > 100 * 1024 * 1024) {
        notifications.show({
          title: 'Error',
          message: `${file.name} is too large (max 100MB)`,
          color: 'red',
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of validFiles) {
        const result = await api.uploadFile(file);
        setAttachments((prev) => [...prev, result]);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to upload file',
        color: 'red',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    createComment.mutate(
      { content: content.trim(), images: attachments.length > 0 ? attachments.map((a) => a.url) : undefined },
      {
        onSuccess: () => {
          setContent('');
          setAttachments([]);
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
            {attachments.length > 0 && (
              <Group gap="xs">
                {attachments.map((attachment, index) => (
                  <Box key={index} pos="relative" w={50} h={50}>
                    {attachment.type === 'image' ? (
                      <Image
                        src={attachment.url}
                        alt={attachment.filename}
                        w={50}
                        h={50}
                        radius="sm"
                        fit="cover"
                      />
                    ) : attachment.type === 'video' ? (
                      <Box
                        w={50}
                        h={50}
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          background: 'var(--mantine-color-dark-6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconPlayerPlay size={20} color="white" />
                      </Box>
                    ) : (
                      <Box
                        w={50}
                        h={50}
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                          background: 'var(--mantine-color-dark-6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconFile size={20} color="white" />
                      </Box>
                    )}
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size="xs"
                      pos="absolute"
                      top={-6}
                      right={-6}
                      onClick={() => handleRemoveAttachment(index)}
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
              <FileButton onChange={handleFilesSelect} multiple>
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
