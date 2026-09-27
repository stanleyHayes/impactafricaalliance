import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { ReviewSummary, type ReviewSection } from './ReviewSummary';

afterEach(() => {
  cleanup();
});

const SECTIONS: ReviewSection[] = [
  {
    title: 'Basics',
    step: 0,
    items: [
      { label: 'Title', value: 'Book the venue' },
      { label: 'Description', value: '', fullRow: true },
    ],
  },
  {
    title: 'Schedule',
    step: 2,
    items: [
      { label: 'Start date', value: null },
      { label: 'Due date', value: '5 Oct' },
    ],
  },
];

const setup = (disabled = false): ReturnType<typeof vi.fn> => {
  const onEdit = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <ReviewSummary sections={SECTIONS} onEdit={onEdit} disabled={disabled} />
    </ThemeProvider>,
  );
  return onEdit;
};

describe('ReviewSummary', () => {
  it('shows each section with its labelled values, and "Not set" for empty ones', () => {
    setup();
    const basics = screen.getByRole('region', { name: 'Basics' });
    expect(within(basics).getByText('Book the venue')).toBeInTheDocument();
    expect(within(basics).getByText('Not set')).toBeInTheDocument();
    const schedule = screen.getByRole('region', { name: 'Schedule' });
    expect(within(schedule).getByText('5 Oct')).toBeInTheDocument();
    expect(within(schedule).getByText('Not set')).toBeInTheDocument();
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('returns to the section’s own step from its Edit button', () => {
    const onEdit = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit schedule' }));
    expect(onEdit).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: 'Edit basics' }));
    expect(onEdit).toHaveBeenLastCalledWith(0);
  });

  it('holds the Edit buttons while a save is running', () => {
    const onEdit = setup(true);
    expect(screen.getByRole('button', { name: 'Edit basics' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit schedule' })).toBeDisabled();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
