import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from '../../lib/api-client';
import { renderWithProviders } from '../../test/test-utils';

import { EventReviewForm } from './EventReviewSection';

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
