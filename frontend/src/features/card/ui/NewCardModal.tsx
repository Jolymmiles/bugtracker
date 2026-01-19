import { useState } from 'react';
import { Modal, Stack, Title, TextInput, Select, Button, FileButton, Group, Image, ActionIcon, Text, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX, IconPlus, IconPlayerPlay, IconFile } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import { useCreateCard } from '@/entities/card';
import { api } from '@/shared/api';
import { useNewCardModal } from '../model/useNewCardModal';
import { useColorScheme } from '@/shared/lib';
import type { Attachment } from '@/shared/types';

const { checkListItem, image, video, audio, file, ...filteredBlockSpecs } = defaultBlockSpecs;
const schema = BlockNoteSchema.create({
  blockSpecs: filteredBlockSpecs,
});

export function NewCardModal() {
  const navigate = useNavigate();
  const { isOpen, close } = useNewCardModal();
  const createCard = useCreateCard();
  const { colorScheme } = useColorScheme();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<string | null>('issue');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const editor = useCreateBlockNote({ schema });

  const resetForm = () => {
    setTitle('');
    setType('issue');
    setAttachments([]);
    editor.replaceBlocks(editor.document, []);
  };

  const handleClose = () => {
    resetForm();
    close();
  };

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
      notifications.show({
        title: 'Success',
        message: `${validFiles.length} file(s) uploaded successfully`,
        color: 'green',
      });
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

  const getDescription = async () => {
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    return markdown;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Title is required',
        color: 'red',
      });
      return;
    }

    const description = await getDescription();

    createCard.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type: type || 'issue',
        images: attachments.length > 0 ? attachments.map((a) => a.url) : undefined,
      },
      {
        onSuccess: (card) => {
          notifications.show({
            title: 'Success',
            message: 'Card created successfully',
            color: 'green',
          });
          handleClose();
          navigate(`/c/${card.id}`);
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to create card. Please try again.',
            color: 'red',
          });
        },
      }
    );
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      size="lg"
      title={<Title order={3}>Create New Card</Title>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Select
            label="Type"
            value={type}
            onChange={setType}
            data={[
              { value: 'issue', label: 'Issue (Bug Report)' },
              { value: 'suggestion', label: 'Suggestion' },
            ]}
            required
          />

          <TextInput
            label="Title"
            placeholder="Brief description of the issue or suggestion"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>Description</Text>
            <Box
              style={{
                border: '1px solid var(--mantine-color-default-border)',
                borderRadius: 'var(--mantine-radius-md)',
                minHeight: 200,
              }}
            >
              <BlockNoteView
                editor={editor}
                theme={colorScheme}
              />
            </Box>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={500}>Attachments (optional, max 100MB per file)</Text>
            
            <Group gap="xs">
              {attachments.map((attachment, index) => (
                <Box key={index} pos="relative" w={60} h={60}>
                  {attachment.type === 'image' ? (
                    <Image
                      src={attachment.url}
                      alt={attachment.filename}
                      w={60}
                      h={60}
                      radius="sm"
                      fit="cover"
                    />
                  ) : attachment.type === 'video' ? (
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
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="xs"
                    pos="absolute"
                    top={-6}
                    right={-6}
                    onClick={() => handleRemoveAttachment(index)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </Box>
              ))}
              
              <FileButton onChange={handleFilesSelect} multiple>
                {(props) => (
                  <ActionIcon
                    {...props}
                    variant="light"
                    size={60}
                    loading={uploading}
                  >
                    {uploading ? null : <IconPlus size={24} />}
                  </ActionIcon>
                )}
              </FileButton>
            </Group>
          </Stack>

          <Button type="submit" size="md" loading={createCard.isPending}>
            Submit
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
