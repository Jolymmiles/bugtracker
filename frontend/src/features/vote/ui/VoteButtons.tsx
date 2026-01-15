import { Group, Button, Text, ActionIcon, CopyButton, Tooltip } from '@mantine/core';
import { IconThumbUp, IconThumbDown, IconCopy, IconCheck } from '@tabler/icons-react';
import { useVote } from '../model/useVote';
import { useAuth } from '@/features/auth';
import type { Card } from '@/shared/types';

interface VoteButtonsProps {
  card: Card;
}

export function VoteButtons({ card }: VoteButtonsProps) {
  const { user, openLoginModal } = useAuth();
  const voteMutation = useVote();

  const handleVote = (value: number) => {
    if (!user) {
      openLoginModal();
      return;
    }
    const newValue = card.user_vote === value ? 0 : value;
    voteMutation.mutate({ cardId: card.id, value: newValue });
  };

  return (
    <Group gap="xs">
      <Button
        variant={card.user_vote === 1 ? 'filled' : 'light'}
        color="teal"
        size="sm"
        leftSection={<IconThumbUp size={16} />}
        onClick={() => handleVote(1)}
        loading={voteMutation.isPending}
      >
        <Text size="sm" fw={500}>
          {card.likes || 0}
        </Text>
      </Button>

      <Button
        variant={card.user_vote === -1 ? 'filled' : 'light'}
        color="red"
        size="sm"
        leftSection={<IconThumbDown size={16} />}
        onClick={() => handleVote(-1)}
        loading={voteMutation.isPending}
      >
        <Text size="sm" fw={500}>
          {card.dislikes || 0}
        </Text>
      </Button>

      <CopyButton value={`${window.location.origin}/c/${card.id}`} timeout={2000}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copied!' : 'Copy link'} withArrow>
            <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
