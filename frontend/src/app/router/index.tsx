import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth, LoginModal } from '@/features/auth';
import { NewCardModal } from '@/features/card';
import { Header } from '@/widgets/header';
import { HomePage } from '@/pages/home';
import { api } from '@/shared/api';

export function AppRouter() {
  const { checkAuth } = useAuth();
  const [botUsername, setBotUsername] = useState('');

  useEffect(() => {
    checkAuth();
    api.getConfig().then((config) => setBotUsername(config.bot_username));
  }, [checkAuth]);

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:id" element={<HomePage />} />
      </Routes>
      <LoginModal botUsername={botUsername} />
      <NewCardModal />
    </>
  );
}
