import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { theme } from '../theme/theme';

const AllProviders = ({ children }: { children: ReactNode }): JSX.Element => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

/** Render a component wrapped in the app's theme, router, and query providers. */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> => render(ui, { wrapper: AllProviders, ...options });

/**
 * The element painting `url` as its CSS background, if any.
 *
 * Banners are backgrounds rather than `<img>` elements, so a test asking
 * "which picture is this banner?" has to look at computed styles.
 */
export const findBackground = (container: Element, url: string): Element | undefined =>
  Array.from(container.querySelectorAll('*')).find((element) =>
    getComputedStyle(element).backgroundImage.includes(url),
  );
