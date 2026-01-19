import { useState } from 'react';
import { Modal, Image, ActionIcon, Group, Box, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX, IconDownload } from '@tabler/icons-react';

export interface MediaItem {
  url: string;
  type?: 'image' | 'video' | 'file';
  filename?: string;
}

interface MediaModalProps {
  items: MediaItem[];
  initialIndex?: number;
  opened: boolean;
  onClose: () => void;
}

function getMediaType(item: MediaItem): 'image' | 'video' | 'file' {
  if (item.type) return item.type;
  
  const url = item.url.toLowerCase();
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) return 'image';
  if (url.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i)) return 'video';
  return 'file';
}

export function MediaModal({ items, initialIndex = 0, opened, onClose }: MediaModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentItem = items[currentIndex];
  const mediaType = currentItem ? getMediaType(currentItem) : 'file';
  const hasMultiple = items.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  if (!currentItem) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      padding={0}
      withCloseButton={false}
      centered
      styles={{
        content: {
          background: 'transparent',
          boxShadow: 'none',
        },
        body: {
          padding: 0,
        },
      }}
      onKeyDown={handleKeyDown}
    >
      <Box pos="relative">
        <ActionIcon
          variant="filled"
          color="dark"
          size="lg"
          pos="absolute"
          top={10}
          right={10}
          style={{ zIndex: 10 }}
          onClick={onClose}
        >
          <IconX size={20} />
        </ActionIcon>

        {mediaType === 'image' && (
          <Image
            src={currentItem.url}
            alt={currentItem.filename || 'Image'}
            fit="contain"
            mah="80vh"
            radius="md"
            style={{ background: 'var(--mantine-color-dark-7)' }}
          />
        )}

        {mediaType === 'video' && (
          <Box
            style={{
              background: 'var(--mantine-color-dark-7)',
              borderRadius: 'var(--mantine-radius-md)',
              overflow: 'hidden',
            }}
          >
            <video
              src={currentItem.url}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </Box>
        )}

        {mediaType === 'file' && (
          <Box
            p="xl"
            style={{
              background: 'var(--mantine-color-dark-7)',
              borderRadius: 'var(--mantine-radius-md)',
              textAlign: 'center',
            }}
          >
            <Text c="white" mb="md">
              {currentItem.filename || 'File'}
            </Text>
            <ActionIcon
              component="a"
              href={currentItem.url}
              download={currentItem.filename}
              target="_blank"
              variant="filled"
              color="blue"
              size="xl"
            >
              <IconDownload size={24} />
            </ActionIcon>
          </Box>
        )}

        {hasMultiple && (
          <>
            <ActionIcon
              variant="filled"
              color="dark"
              size="xl"
              pos="absolute"
              left={10}
              top="50%"
              style={{ transform: 'translateY(-50%)', zIndex: 10 }}
              onClick={goToPrevious}
            >
              <IconChevronLeft size={24} />
            </ActionIcon>

            <ActionIcon
              variant="filled"
              color="dark"
              size="xl"
              pos="absolute"
              right={10}
              top="50%"
              style={{ transform: 'translateY(-50%)', zIndex: 10 }}
              onClick={goToNext}
            >
              <IconChevronRight size={24} />
            </ActionIcon>

            <Group
              justify="center"
              pos="absolute"
              bottom={10}
              left={0}
              right={0}
              style={{ zIndex: 10 }}
            >
              <Text c="white" size="sm" bg="dark" px="sm" py="xs" style={{ borderRadius: 8 }}>
                {currentIndex + 1} / {items.length}
              </Text>
            </Group>
          </>
        )}
      </Box>
    </Modal>
  );
}
