import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppTheme } from '../theme/theme';

import Submissions from './Submissions';

vi.mock('../lib/admin-hooks', () => ({
  useSubmissions: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateSubmissionStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

const VIEW_KEY = 'iaa.admin.view.submissions';

const renderEmptyInbox = (): void => {
  render(
    <ThemeProvider theme={createAppTheme('iaa', 'dark', 'neumorphism')}>
      <MemoryRouter initialEntries={['/submissions/mentors']}>
        <Routes>
          <Route path="/submissions/:inbox" element={<Submissions />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
};

/** The box the empty state's title and medallion are laid out in. */
const emptyState = (): HTMLElement =>
  screen.getByRole('heading', { name: 'No submissions yet' }).parentElement as HTMLElement;

afterEach(() => {
  cleanup();
  localStorage.removeItem(VIEW_KEY);
});

describe('Submissions with an empty inbox', () => {
  // The table's empty panel is already a card. A second card inside it
  // floated, narrower, in the middle of the first (the owner's Neumorphism shot).
  it('puts the empty state straight into the table’s panel', () => {
    renderEmptyInbox();
    const panel = emptyState().parentElement as HTMLElement;
    expect(getComputedStyle(panel).minHeight).toBe('420px');
  });

  it('gives it a panel of its own in the card view, where there is no table', () => {
    localStorage.setItem(VIEW_KEY, 'grid');
    renderEmptyInbox();
    const panel = getComputedStyle(emptyState().parentElement as HTMLElement);
    expect(panel.borderRadius).not.toBe('');
    expect(panel.minHeight).not.toBe('420px');
  });
});
