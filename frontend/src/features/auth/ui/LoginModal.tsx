import { useEffect, useState } from 'react';
import { Modal, Stack, Text, Center, Box, Loader } from '@mantine/core';
import { useAuth } from '../model/useAuth';

declare global {
  interface Window {
    onTelegramAuth: (user: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
      auth_date: number;
      hash: string;
    }) => void;
  }
}

interface LoginModalProps {
  botUsername: string;
}

export function LoginModal({ botUsername }: LoginModalProps) {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();
  const [widgetContainer, setWidgetContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      const success = await login(user);
      if (!success) {
        alert('Authentication failed. Please try again.');
      }
    };

    return () => {
      delete (window as { onTelegramAuth?: unknown }).onTelegramAuth;
    };
  }, [login]);

  useEffect(() => {
    if (isLoginModalOpen && widgetContainer && botUsername) {
      widgetContainer.innerHTML = '';

      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;

      widgetContainer.appendChild(script);
    }
  }, [isLoginModalOpen, widgetContainer, botUsername]);

  return (
    <Modal
      opened={isLoginModalOpen}
      onClose={closeLoginModal}
      title="Log In"
      centered
    >
      <Stack gap="md">
        <Text c="dimmed">
          Log in here to report bugs or suggest features. Click the button below to authenticate with Telegram.
        </Text>

        <Center py="md">
          {!botUsername && <Loader size="sm" />}
          <Box ref={setWidgetContainer} style={{ display: botUsername ? 'block' : 'none' }} />
        </Center>
      </Stack>
    </Modal>
  );
}
