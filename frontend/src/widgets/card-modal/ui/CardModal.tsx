import { useState, useMemo } from 'react';
import { Modal, Stack, Text, Group, Badge, Box, Divider, Loader, Center, Image, Button, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlayerPlay, IconFile } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCard } from '@/entities/card';
import { VoteButtons } from '@/features/vote';
import { CommentList } from '@/features/comment';
import { useAuth } from '@/features/auth';
import { formatDate, useColorScheme } from '@/shared/lib';
import { api } from '@/shared/api';
import { MediaModal, type MediaItem } from '@/shared/ui';

const STATUS_COLORS: Record<string, string> = {
  open: 'cyan',
  closed: 'orange',
  fixed: 'green',
  fix_coming: 'lime',
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'fix_coming', label: 'Fix Coming' },
];

function DescriptionViewer({ markdown }: { markdown: string }) {
  const { colorScheme } = useColorScheme();
  const editor = useCreateBlockNote();

  useMemo(() => {
    if (markdown) {
      editor.tryParseMarkdownToBlocks(markdown).then((blocks) => {
        editor.replaceBlocks(editor.document, blocks);
      });
    }
  }, [markdown, editor]);

  return (
    <Box style={{ pointerEvents: 'none' }} className="blocknote-readonly">
      <style>{`.blocknote-readonly .bn-editor { padding-left: 0 !important; padding-inline-start: 0 !important; }`}</style>
      <BlockNoteView editor={editor} theme={colorScheme} editable={false} sideMenu={false} />
    </Box>
  );
}

export function CardModal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cardId = parseInt(id || '0', 10);
  const { data, isLoading, error } = useCard(cardId);
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaInitialIndex, setMediaInitialIndex] = useState(0);

  const isAdmin = user?.is_admin ?? false;

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
  };

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i);
  };

  const isMediaUrl = (url: string) => isImageUrl(url) || isVideoUrl(url);

  const mediaItems: MediaItem[] = useMemo(() => {
    if (!data?.card?.images) return [];
    return data.card.images.filter(isMediaUrl).map((url) => ({ url }));
  }, [data?.card?.images]);

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

  const handleClose = () => {
    navigate('/');
  };

  const handleDelete = async () => {
    if (!data?.card || !confirm('Are you sure you want to delete this card?')) return;
    setDeleting(true);
    try {
      await api.deleteCard(data.card.id);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      notifications.show({ title: 'Success', message: 'Card deleted', color: 'green' });
      handleClose();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete card', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (status: string | null) => {
    if (!data?.card || !status) return;
    setUpdatingStatus(true);
    try {
      await api.updateCardStatus(data.card.id, status);
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      notifications.show({ title: 'Success', message: 'Status updated', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update status', color: 'red' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const modalTitle = data?.card ? (
    <Stack gap={4}>
      <Text size="lg" fw={500} style={{ wordBreak: 'break-word' }}>
        {data.card.title}
      </Text>
      <Group gap="xs">
        {data.card.author && (
          <Text size="sm" c="blue">
            {data.card.author.first_name} {data.card.author.last_name}
          </Text>
        )}
        <Text size="sm" c="dimmed">
          {formatDate(data.card.created_at)}
        </Text>
        <Badge size="sm" color={STATUS_COLORS[data.card.status] || 'gray'}>
          {data.card.status.replace('_', ' ')}
        </Badge>
        <Badge size="sm" variant="light" color="gray">
          {data.card.type === 'issue' ? 'Issue' : 'Suggestion'}
        </Badge>
      </Group>
    </Stack>
  ) : null;

  return (
    <Modal
      opened={!!id}
      onClose={handleClose}
      size="xl"
      padding="xl"
      title={modalTitle}
      withCloseButton
      closeButtonProps={{ size: 'lg' }}
      styles={{
        body: { overflow: 'hidden' },
        title: { flex: 1 },
      }}
    >
      {isLoading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {error && (
        <Center py="xl">
          <Text c="red">Error loading card</Text>
        </Center>
      )}

      {data?.card && (
        <Stack gap="md">
          {data.card.description && (
            <DescriptionViewer markdown={data.card.description} />
          )}

          {data.card.images && data.card.images.length > 0 && (
            <Group gap="xs">
              {data.card.images.map((url, index) => (
                <Box
                  key={index}
                  w={80}
                  h={80}
                  pos="relative"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleFileClick(url)}
                >
                  {isImageUrl(url) ? (
                    <Image
                      src={url}
                      alt={`Image ${index + 1}`}
                      w={80}
                      h={80}
                      radius="sm"
                      fit="cover"
                    />
                  ) : isVideoUrl(url) ? (
                    <Box
                      w={80}
                      h={80}
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                        background: 'var(--mantine-color-dark-6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconPlayerPlay size={32} color="white" />
                    </Box>
                  ) : (
                    <Box
                      w={80}
                      h={80}
                      style={{
                        borderRadius: 'var(--mantine-radius-sm)',
                        background: 'var(--mantine-color-dark-6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconFile size={32} color="white" />
                    </Box>
                  )}
                </Box>
              ))}
            </Group>
          )}

          <Divider />

          <VoteButtons card={data.card} />

          {isAdmin && (
            <Group gap="sm">
              <Select
                size="xs"
                value={data.card.status}
                onChange={handleStatusChange}
                data={STATUS_OPTIONS}
                disabled={updatingStatus}
                style={{ width: 140 }}
              />
              <Button
                size="xs"
                color="red"
                variant="light"
                leftSection={<IconTrash size={14} />}
                onClick={handleDelete}
                loading={deleting}
              >
                Delete Card
              </Button>
            </Group>
          )}

          <CommentList cardId={data.card.id} comments={data.comments || []} isAdmin={isAdmin} />
        </Stack>
      )}

      <MediaModal
        items={mediaItems}
        initialIndex={mediaInitialIndex}
        opened={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
      />
    </Modal>
  );
}
