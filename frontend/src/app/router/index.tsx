import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth, LoginModal } from '@/features/auth';
import { NewCardModal } from '@/features/card';
import { Header } from '@/widgets/header';
import { HomePage } from '@/pages/home';

export function AppRouter() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:id" element={<HomePage />} />
      </Routes>
      <LoginModal />
      <NewCardModal />
    </>
  );
}
