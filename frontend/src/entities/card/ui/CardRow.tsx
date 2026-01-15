import { Paper, Group, Box, Text, Badge, Stack } from '@mantine/core';
import { IconMessageCircle, IconThumbUp } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { Card } from '@/shared/types';
import { timeAgo } from '@/shared/lib';

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

const THUMB_COLORS = [
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f78ca0 0%, #fe9a8b 100%)',
];

interface CardRowProps {
  card: Card;
}

export function CardRow({ card }: CardRowProps) {
  const thumbColor = THUMB_COLORS[card.id % THUMB_COLORS.length];

  return (
    <Paper
      component={Link}
      to={`/c/${card.id}`}
      p="md"
      withBorder
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <Group align="flex-start" gap="md" wrap="nowrap">
        <Box
          w={80}
          h={80}
          style={{
            borderRadius: 10,
            flexShrink: 0,
            background: card.images?.[0] ? `url(${card.images[0]}) center/cover` : thumbColor,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!card.images?.[0] && (
            <Box
              w={40}
              h={40}
              style={{
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '50%',
              }}
            />
          )}
          {card.status !== 'open' && (
            <Badge
              size="xs"
              variant="filled"
              color="dark"
              style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                right: 4,
                textTransform: 'capitalize',
              }}
            >
              {card.status.replace('_', ' ')}
            </Badge>
          )}
        </Box>

        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text fw={500} lineClamp={1}>
            {card.title}
          </Text>
          <Text size="sm" c="dimmed" lineClamp={2}>
            {stripMarkdown(card.description || '')}
          </Text>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                {timeAgo(card.created_at)}
              </Text>
              <Text size="xs" c="dimmed">
                {card.type === 'issue' ? 'Issue' : 'Suggestion'}
              </Text>
            </Group>
            <Group gap="sm">
              {card.comment_count > 0 && (
                <Group gap={4}>
                  <Text size="sm" c="dimmed">
                    {card.comment_count}
                  </Text>
                  <IconMessageCircle size={14} color="gray" />
                </Group>
              )}
              {card.rating > 0 && (
                <Group gap={4}>
                  <Text size="sm" c="teal">
                    {card.rating}
                  </Text>
                  <IconThumbUp size={14} color="teal" />
                </Group>
              )}
              {card.rating < 0 && (
                <Group gap={4}>
                  <Text size="sm" c="red">
                    {card.rating}
                  </Text>
                  <IconThumbUp size={14} color="red" style={{ transform: 'rotate(180deg)' }} />
                </Group>
              )}
            </Group>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
