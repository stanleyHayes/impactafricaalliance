import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from '../../lib/api-client';
import { renderWithProviders } from '../../test/test-utils';

import { ReviewForm } from './ReviewForm';

vi.mock('../../lib/api-client', () => ({ apiPost: vi.fn() }));

describe('ReviewForm', () => {
  beforeEach(() => vi.clearAllMocks());
  it('requires a rating without sending a request', () => {
    renderWithProviders(<ReviewForm />);
    fireEvent.submit(screen.getByRole('form', { name: 'Share your experience.' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a rating first.');
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('retains values when returning to the first step', () => {
    renderWithProviders(<ReviewForm />);
    fireEvent.click(screen.getByRole('radio', { name: '5 stars — Excellent' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Your review (optional)' }), {
      target: { value: 'A useful workshop.' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Share your experience.' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Public name' }), {
      target: { value: 'Ama' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('textbox', { name: 'Your review (optional)' })).toHaveValue(
      'A useful workshop.',
    );
    expect(screen.getByRole('radio', { name: '5 stars — Excellent' })).toBeChecked();
    fireEvent.submit(screen.getByRole('form', { name: 'Share your experience.' }));
    expect(screen.getByRole('textbox', { name: 'Public name' })).toHaveValue('Ama');
    expect(apiPost).not.toHaveBeenCalled();
  });
  it('preserves the submission contract and shows email confirmation', async () => {
    vi.mocked(apiPost).mockResolvedValue({});
    renderWithProviders(<ReviewForm />);
    fireEvent.click(screen.getByRole('radio', { name: '4 stars — Very good' }));
    fireEvent.submit(screen.getByRole('form', { name: 'Share your experience.' }));
    expect(apiPost).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Public name' }), {
      target: { value: ' Ama ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email address' }), {
      target: { value: 'ama@example.com' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Share your experience.' }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith('/reviews/organisation', {
        rating: 4,
        displayName: 'Ama',
        email: 'ama@example.com',
        role: undefined,
        comment: undefined,
        consent: true,
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Check your email');
  });
});
