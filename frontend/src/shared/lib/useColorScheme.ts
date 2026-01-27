import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ColorScheme = 'light' | 'dark';

const getSystemTheme = (): ColorScheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

interface ColorSchemeState {
  colorScheme: ColorScheme;
  toggleColorScheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useColorSchemeStore = create<ColorSchemeState>()(
  persist(
    (set) => ({
      colorScheme: getSystemTheme(),
      toggleColorScheme: () =>
        set((state) => ({
          colorScheme: state.colorScheme === 'light' ? 'dark' : 'light',
        })),
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'color-scheme',
    }
  )
);

export function useColorScheme() {
  const store = useColorSchemeStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      store.setColorScheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [store]);

  return store;
}
