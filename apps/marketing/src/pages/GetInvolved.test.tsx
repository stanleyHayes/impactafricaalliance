import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiGet } from '../lib/api-client';
import type * as ApiClient from '../lib/api-client';
import { theme } from '../theme/theme';

import GetInvolved from './GetInvolved';

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  apiGet: vi.fn(),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: vi.fn(), inView: true }),
}));

/** Open Get Involved at this address, with the content API answering nothing at all. */
const visit = (address: string): void => {
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[address]}>
          <GetInvolved />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
};

describe('a link to one of Get Involved’s tabs', () => {
  const scrolled = vi.fn();

  beforeEach(() => {
    vi.mocked(apiGet)
      .mockReset()
      .mockReturnValue(new Promise(() => undefined));
    // jsdom lays nothing out, so it has no scrolling of its own to watch.
    Element.prototype.scrollIntoView = scrolled;
  });

  afterEach(() => {
    scrolled.mockReset();
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('takes a donor following #donate down to the form, not the top of the page', async () => {
    visit('/get-involved#donate');
    const form = await screen.findByRole('form', { name: 'Make a donation' });
    await waitFor(() => expect(scrolled).toHaveBeenCalledWith({ block: 'start' }));
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled.mock.contexts[0]).toBe(form);
  });

  it('scrolls once a visit, not again as the donor moves between the tabs', async () => {
    visit('/get-involved#donate');
    await waitFor(() => expect(scrolled).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('tab', { name: 'Partner With Us' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Donate' }));
    expect(await screen.findByRole('form', { name: 'Make a donation' })).toBeInTheDocument();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrolled).toHaveBeenCalledTimes(1);
  });

  it('leaves the other tabs’ links at the top of the page, as before', async () => {
    visit('/get-involved#partner');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scrolled).not.toHaveBeenCalled();
  });
});
