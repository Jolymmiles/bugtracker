import { useEffect, useRef, useMemo } from 'react';
import { Stack, Group, Text, SegmentedControl, Center, Loader } from '@mantine/core';
import { useCards, CardRow } from '@/entities/card';
import { useCardFilters } from '@/features/card';
import type { SortType } from '@/shared/types';

export function CardList() {
  const { sort, type, status, query, setSort } = useCardFilters();
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCards({ sort, type, status, query });

  const cards = useMemo(
    () => data?.pages.flatMap((page) => page.cards ?? []) ?? [],
    [data]
  );

  const total = data?.pages[0]?.total ?? 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSortChange = (value: string) => {
    setSort(value as SortType);
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
          {total} Cards
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
        {cards.map((card) => (
          <CardRow key={card.id} card={card} />
        ))}
      </Stack>

      {cards.length === 0 && (
        <Center py="xl">
          <Text c="dimmed">No cards found</Text>
        </Center>
      )}

      <div ref={observerRef} style={{ height: 1 }} />

      {isFetchingNextPage && (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      )}
    </Stack>
  );
}
