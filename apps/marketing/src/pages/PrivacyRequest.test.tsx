import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as RouterModule from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiPost } from '../lib/api-client';
import { renderWithProviders } from '../test/test-utils';

import PrivacyRequest from './PrivacyRequest';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof RouterModule>()),
  useLocation: () => ({
    pathname: '/privacy-request',
    search: '',
    hash: '',
    state: null,
    key: 'test',
  }),
}));
vi.mock('../lib/api-client', () => ({ apiPost: vi.fn() }));
vi.mock('../lib/content-hooks', () => ({
  usePageCopy: (_key: string, defaults: unknown) => defaults,
}));

describe('PrivacyRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates email before sending a request', async () => {
    renderWithProviders(<PrivacyRequest />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(
      await screen.findByText(/email/i, { selector: '.MuiFormHelperText-root' }),
    ).toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('keeps details after an error and shows the reference after retrying', async () => {
    vi.mocked(apiPost)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'request-123' });
    renderWithProviders(<PrivacyRequest />);
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'reader@example.com');
    await user.type(
      screen.getByRole('textbox', { name: 'Details (optional)' }),
      'Please send my data.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t send your request.');
    expect(screen.getByRole('textbox', { name: 'Details (optional)' })).toHaveValue(
      'Please send my data.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('heading', { name: 'Request received' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('request-123');
    expect(apiPost).toHaveBeenLastCalledWith(
      '/privacy/requests',
      expect.objectContaining({
        email: 'reader@example.com',
        type: 'access',
        details: 'Please send my data.',
      }),
    );
  });
});
