import { Stack, Group, Text, Button, SegmentedControl, Center, Loader } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { useCards, CardRow } from '@/entities/card';
import type { SortType, CardType } from '@/shared/types';

export function CardList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = (searchParams.get('sort') || 'rate') as SortType;
  const type = (searchParams.get('type') || '') as CardType;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const query = searchParams.get('query') || '';

  const { data, isLoading, error } = useCards({ sort, type, page, query });

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', value);
    newParams.delete('page');
    setSearchParams(newParams);
  };

  const handleLoadMore = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', (page + 1).toString());
    setSearchParams(newParams);
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Text c="red">Error loading cards</Text>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {data?.total || 0} Cards
        </Text>
        <SegmentedControl
          size="xs"
          value={sort}
          onChange={handleSortChange}
          data={[
            { label: 'by rating', value: 'rate' },
            { label: 'by time', value: 'time' },
          ]}
        />
      </Group>

      <Stack gap="sm">
        {data?.cards.map((card) => (
          <CardRow key={card.id} card={card} />
        ))}
      </Stack>

      {data?.cards.length === 0 && (
        <Center py="xl">
          <Text c="dimmed">No cards found</Text>
        </Center>
      )}

      {data?.has_more && (
        <Center py="md">
          <Button variant="light" onClick={handleLoadMore}>
            Load More
          </Button>
        </Center>
      )}
    </Stack>
  );
}
