import { Group, Text, Button, Avatar, Menu, Container, Box, ActionIcon } from '@mantine/core';
import { IconLogout, IconUser, IconSun, IconMoon } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useColorScheme } from '@/shared/lib';

export function Header() {
  const { user, openLoginModal, logout } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Box component="header" py="md">
      <Container size="lg">
        <Group justify="space-between">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Group gap="sm">
              <Box
                w={40}
                h={40}
                style={{
                  background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
                  borderRadius: 10,
                }}
              />
              <Text size="lg" fw={500}>
                Bugs and Suggestions
              </Text>
            </Group>
          </Link>

          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              onClick={toggleColorScheme}
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>

            {user ? (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="subtle" px="xs">
                    <Group gap="sm">
                      <Avatar src={user.photo_url} size="sm" radius="xl">
                        {user.first_name[0]}
                      </Avatar>
                      <Text size="sm" fw={500}>
                        {user.first_name}
                      </Text>
                    </Group>
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Account</Menu.Label>
                  <Menu.Item leftSection={<IconUser size={14} />}>
                    {user.first_name} {user.last_name}
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={logout}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Button variant="subtle" onClick={openLoginModal}>
                Login
              </Button>
            )}
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
