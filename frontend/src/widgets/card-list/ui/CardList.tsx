import { Stack, Group, Text, Button, SegmentedControl, Center, Loader } from '@mantine/core';
import { useCards, CardRow } from '@/entities/card';
import { useCardFilters } from '@/features/card';
import type { SortType } from '@/shared/types';

export function CardList() {
  const { sort, type, page, query, setSort, setPage } = useCardFilters();

  const { data, isLoading, error } = useCards({ sort, type, page, query });

  const handleSortChange = (value: string) => {
    setSort(value as SortType);
  };

  const handleLoadMore = () => {
    setPage(page + 1);
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
        {data?.cards?.map((card) => (
          <CardRow key={card.id} card={card} />
        ))}
      </Stack>

      {data?.cards?.length === 0 && (
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
