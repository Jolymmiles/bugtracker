import { Container } from '@mantine/core';
import { SearchHeader } from '@/widgets/search-header';
import { CardList } from '@/widgets/card-list';
import { CardModal } from '@/widgets/card-modal';

export function HomePage() {
  return (
    <>
      <SearchHeader />
      <Container size="lg" py="md">
        <CardList />
      </Container>
      <CardModal />
    </>
  );
}
