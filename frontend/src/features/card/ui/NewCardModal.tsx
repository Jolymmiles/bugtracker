import { useState } from 'react';
import { Modal, Stack, Title, TextInput, Select, Button, FileButton, Group, Image, ActionIcon, Text, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX, IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import { useCreateCard } from '@/entities/card';
import { api } from '@/shared/api';
import { useNewCardModal } from '../model/useNewCardModal';
import { useColorScheme } from '@/shared/lib';

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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const editor = useCreateBlockNote({ schema });

  const resetForm = () => {
    setTitle('');
    setType('issue');
    setImages([]);
    editor.replaceBlocks(editor.document, []);
  };

  const handleClose = () => {
    resetForm();
    close();
  };

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
      notifications.show({
        title: 'Success',
        message: 'Image uploaded successfully',
        color: 'green',
      });
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
        images: images.length > 0 ? images : undefined,
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
            <Text size="sm" fw={500}>Images (optional)</Text>
            
            <Group gap="xs">
              {images.map((url, index) => (
                <Box key={index} pos="relative" w={60} h={60}>
                  <Image
                    src={url}
                    alt={`Image ${index + 1}`}
                    w={60}
                    h={60}
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
                    <IconX size={12} />
                  </ActionIcon>
                </Box>
              ))}
              
              <FileButton
                onChange={handleFileSelect}
                accept="image/*"
              >
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
