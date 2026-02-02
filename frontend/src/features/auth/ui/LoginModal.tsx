import { Modal, Stack, Text, Center, Button } from '@mantine/core';
import { IconBrandTelegram } from '@tabler/icons-react';
import { useAuth } from '../model/useAuth';

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useAuth();

  const handleLogin = () => {
    window.location.href = '/auth/telegram';
  };

  return (
    <Modal opened={isLoginModalOpen} onClose={closeLoginModal} title="Log In" centered>
      <Stack gap="md">
        <Text c="dimmed">
          Log in here to report bugs or suggest features.
        </Text>
        <Center py="md">
          <Button leftSection={<IconBrandTelegram />} onClick={handleLogin} size="lg">
            Login with Telegram
          </Button>
        </Center>
      </Stack>
    </Modal>
  );
}
