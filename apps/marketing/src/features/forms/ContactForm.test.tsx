import { SubmissionType } from '@iaa/shared';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSubmitForm } from '../../lib/mutations';
import { renderWithProviders } from '../../test/test-utils';

import { ContactForm } from './ContactForm';

vi.mock('../../lib/mutations', () => ({
  useSubmitForm: vi.fn(),
}));

const mutate = vi.fn();

describe('ContactForm', () => {
  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useSubmitForm).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      isError: false,
    } as unknown as ReturnType<typeof useSubmitForm>);
  });

  it('submits the validated contact payload', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm />);

    await user.type(screen.getByLabelText('Full name'), 'Ama Mensah');
    await user.type(screen.getByLabelText('Email address'), 'ama@example.com');
    await user.type(screen.getByLabelText('Subject'), 'Programme enquiry');
    await user.type(
      screen.getByLabelText('Message'),
      'I would like to learn more about the digital skills programme.',
    );
    await user.click(screen.getByRole('checkbox', { name: /i agree to the processing/i }));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SubmissionType.Contact,
          name: 'Ama Mensah',
          email: 'ama@example.com',
          subject: 'Programme enquiry',
          message: 'I would like to learn more about the digital skills programme.',
          consent: true,
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
  });

  it('shows its own message on every empty answer instead of the browser’s', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ContactForm />);
    expect(container.querySelector('form')).toHaveAttribute('novalidate');

    await user.type(screen.getByLabelText('Email address'), 'ama@');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    // Checking is asynchronous, so wait for the messages to arrive.
    await waitFor(() =>
      expect(screen.getByLabelText('Full name')).toHaveAccessibleDescription(
        'This field is required.',
      ),
    );
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'Enter an email address, like name@example.com.',
    );
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
    expect(mutate).not.toHaveBeenCalled();
  });
});
