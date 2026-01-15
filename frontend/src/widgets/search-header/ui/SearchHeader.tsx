import { useState } from 'react';
import { Container, TextInput, Group, SegmentedControl, Box, Button } from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useNewCardModal } from '@/features/card';
import type { CardType } from '@/shared/types';

export function SearchHeader() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const type = (searchParams.get('type') || '') as CardType;
  const { user } = useAuth();
  const { open: openNewCardModal } = useNewCardModal();

  const handleTypeChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('type', value);
    } else {
      newParams.delete('type');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('query', query);
    } else {
      newParams.delete('query');
    }
    newParams.delete('page');
    setSearchParams(newParams);
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            mb="md"
          />
        </form>

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
      </Container>
    </Box>
  );
}
