import { createTheme, MantineColorsTuple } from '@mantine/core';

export { MediaModal } from './MediaModal';
export type { MediaItem } from './MediaModal';

const brand: MantineColorsTuple = [
  '#e5f4ff',
  '#cde4ff',
  '#9bc6fc',
  '#64a7f9',
  '#398cf6',
  '#1d7bf5',
  '#0972f5',
  '#0061db',
  '#0056c4',
  '#0049ac',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
  },
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontWeight: '500',
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
  },
});
