import { useEffect, useRef, useMemo } from 'react';
import { Stack, Group, Text, SegmentedControl, Center, Loader } from '@mantine/core';
import { useCards, CardRow } from '@/entities/card';
import { useCardFilters } from '@/features/card';
import type { CardType, SortType, StatusType } from '@/shared/types';

type CardListProps = {
  title?: string;
  params?: {
    sort?: SortType;
    type?: CardType;
    status?: StatusType;
    query?: string;
    mine?: boolean;
  };
  showSort?: boolean;
  showTotal?: boolean;
  totalLabel?: string;
  emptyText?: string;
};

export function CardList({
  title,
  params,
  showSort = params ? false : true,
  showTotal = true,
  totalLabel = 'Cards',
  emptyText = 'No cards found',
}: CardListProps) {
  const { sort: filterSort, type, status, query, mine, setSort } = useCardFilters();
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCards({
    sort: params?.sort ?? filterSort,
    type: params?.type ?? type,
    status: params?.status ?? status,
    query: params?.query ?? query,
    mine: params?.mine ?? mine,
  });

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
    if (params?.sort !== undefined) return;
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
      {(title || showTotal || showSort) && (
        <Group justify="space-between">
          <Group gap="xs">
            {title && <Text fw={600}>{title}</Text>}
            {showTotal && (
              <Text size="sm" c="dimmed">
                {total} {totalLabel}
              </Text>
            )}
          </Group>
          {showSort && (
            <SegmentedControl
              size="xs"
              value={params?.sort ?? filterSort}
              onChange={handleSortChange}
              data={[
                { label: 'by rating', value: 'rate' },
                { label: 'by time', value: 'time' },
              ]}
            />
          )}
        </Group>
      )}

      <Stack gap="sm">
        {cards.map((card) => (
          <CardRow key={card.id} card={card} />
        ))}
      </Stack>

      {cards.length === 0 && (
        <Center py="xl">
          <Text c="dimmed">{emptyText}</Text>
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
