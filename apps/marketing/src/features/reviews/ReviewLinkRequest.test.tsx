import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from '../../lib/api-client';
import { renderWithProviders } from '../../test/test-utils';

import { ReviewLinkRequest } from './ReviewLinkRequest';

vi.mock('../../lib/api-client', () => ({ apiPost: vi.fn() }));

const eventId = '68c2f0a10000000000000001';

const type = (value: string): void => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Email you registered with' }), {
    target: { value },
  });
};

describe('asking for a review link again', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the request for the event being viewed', async () => {
    vi.mocked(apiPost).mockResolvedValue({ sent: true });
    renderWithProviders(<ReviewLinkRequest eventId={eventId} />);
    type('Ama@Example.com');
    fireEvent.submit(screen.getByRole('form', { name: 'Send me my review link' }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith(`/reviews/events/${eventId}/link`, {
        email: 'ama@example.com',
      }),
    );
  });

  it('says the same thing whether or not the address was registered', async () => {
    vi.mocked(apiPost).mockResolvedValue({ sent: true });
    renderWithProviders(<ReviewLinkRequest eventId={eventId} />);
    type('nobody@example.com');
    fireEvent.submit(screen.getByRole('form', { name: 'Send me my review link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('If that address was registered');
  });

  it('refuses an address that is not one', () => {
    renderWithProviders(<ReviewLinkRequest eventId={eventId} />);
    type('not-an-email');
    fireEvent.submit(screen.getByRole('form', { name: 'Send me my review link' }));
    expect(screen.getByText('Enter the email you registered with')).toBeVisible();
    expect(apiPost).not.toHaveBeenCalled();
  });
});
