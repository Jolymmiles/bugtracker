import { useState } from 'react';
import { Container, TextInput, Group, SegmentedControl, Box, Button, Stack } from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { useAuth } from '@/features/auth';
import { useNewCardModal, useCardFilters } from '@/features/card';
import type { CardType, StatusType } from '@/shared/types';

export function SearchHeader() {
  const { type, status, setType, setStatus, setQuery } = useCardFilters();
  const [inputQuery, setInputQuery] = useState('');
  const { user } = useAuth();
  const { open: openNewCardModal } = useNewCardModal();

  const handleTypeChange = (value: string) => {
    setType(value as CardType);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as StatusType);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(inputQuery);
  };

  return (
    <Box
      py="md"
      style={{
        position: 'sticky',
        top: 0,
        background: 'var(--mantine-color-body)',
        zIndex: 100,
      }}
    >
      <Container size="lg">
        <form onSubmit={handleSearch}>
          <TextInput
            placeholder="Describe your issue or suggestion"
            leftSection={<IconSearch size={16} />}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            mb="md"
          />
        </form>

        <Stack gap="sm">
          <Group justify="space-between">
            <SegmentedControl
              value={type}
              onChange={handleTypeChange}
              data={[
                { label: 'All', value: '' },
                { label: 'Issues', value: 'issue' },
                { label: 'Suggestions', value: 'suggestion' },
              ]}
            />

            {user && (
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={openNewCardModal}
              >
                New Card
              </Button>
            )}
          </Group>

          <SegmentedControl
            size="xs"
            value={status}
            onChange={handleStatusChange}
            data={[
              { label: 'Open', value: 'open' },
              { label: 'Fix Coming', value: 'fix_coming' },
              { label: 'Fixed', value: 'fixed' },
              { label: 'Closed', value: 'closed' },
            ]}
          />
        </Stack>
      </Container>
    </Box>
  );
}
