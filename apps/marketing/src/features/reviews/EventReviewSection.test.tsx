import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from '../../lib/api-client';
import { renderWithProviders } from '../../test/test-utils';

import { EventReviewForm, hasTakenPlace } from './EventReviewSection';

vi.mock('../../lib/api-client', () => ({ apiPost: vi.fn() }));

const token = 'test-attendee-review-token';
function completeFirstStep() {
  fireEvent.click(screen.getByRole('radio', { name: '5 Stars' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Anything you want to add (optional)' }), {
    target: { value: 'Great practical session.' },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Review this event' }));
  expect(apiPost).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Name to show' }), {
    target: { value: 'Ama' },
  });
}

describe('event reviews', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requires a rating before advancing', () => {
    renderWithProviders(<EventReviewForm token={token} onDone={vi.fn()} />);
    fireEvent.submit(screen.getByRole('form', { name: 'Review this event' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a rating first.');
    expect(screen.queryByRole('textbox', { name: 'Name to show' })).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('previews the review and preserves values when going back', () => {
    renderWithProviders(<EventReviewForm token={token} onDone={vi.fn()} />);
    completeFirstStep();
    expect(screen.getByText('Great practical session.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: '5 Stars' })).toBeChecked();
    expect(
      screen.getByRole('textbox', { name: 'Anything you want to add (optional)' }),
    ).toHaveValue('Great practical session.');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('textbox', { name: 'Name to show' })).toHaveValue('Ama');
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('submits the rating and comment using the attendee token only on the final step', async () => {
    vi.mocked(apiPost).mockResolvedValue({ status: 'pending' });
    const done = vi.fn();
    renderWithProviders(<EventReviewForm token={token} onDone={done} />);
    completeFirstStep();
    fireEvent.submit(screen.getByRole('form', { name: 'Review this event' }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(apiPost).toHaveBeenCalledWith('/reviews/events', {
      token,
      rating: 5,
      comment: 'Great practical session.',
      displayName: 'Ama',
    });
  });
  it('simulates completion without writing to the API', () => {
    const done = vi.fn();
    renderWithProviders(<EventReviewForm token={token} onDone={done} preview />);
    completeFirstStep();
    fireEvent.submit(screen.getByRole('form', { name: 'Review this event' }));
    expect(done).toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });
});

describe('when an event can be reviewed', () => {
  const now = new Date('2026-09-08T12:00:00Z');

  it('is not reviewable before it starts', () => {
    expect(hasTakenPlace({ startAt: '2026-09-09T10:00:00Z' }, now)).toBe(false);
  });

  it('is not reviewable while it is still running', () => {
    // Started an hour ago, another hour to go: too early to judge it.
    expect(
      hasTakenPlace({ startAt: '2026-09-08T11:00:00Z', endAt: '2026-09-08T13:00:00Z' }, now),
    ).toBe(false);
  });

  it('is reviewable once it has finished', () => {
    expect(
      hasTakenPlace({ startAt: '2026-09-08T09:00:00Z', endAt: '2026-09-08T11:00:00Z' }, now),
    ).toBe(true);
  });

  it('falls back to the start time when no end was recorded', () => {
    expect(hasTakenPlace({ startAt: '2026-09-08T11:00:00Z' }, now)).toBe(true);
  });
});
