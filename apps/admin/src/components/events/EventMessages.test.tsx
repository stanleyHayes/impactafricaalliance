import type { Event } from '@iaa/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventMessages } from './EventMessages';

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), refetch: vi.fn(), failed: false }));
vi.mock('../../lib/admin-hooks', () => ({
  useEventMessages: () => ({
    data: { items: [] },
    isLoading: false,
    isError: mocks.failed,
    refetch: mocks.refetch,
  }),
  useSendEventMessage: () => ({ mutate: mocks.mutate, isPending: false }),
}));
const event = {
  id: 'e1',
  title: 'Community workshop',
  startAt: '2026-10-01T10:00:00Z',
  location: 'Accra',
} as Event;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.failed = false;
});

describe('event message composer', () => {
  it('previews the draft and requires confirmation before sending', () => {
    render(<EventMessages event={event} />);
    expect(screen.getByRole('button', { name: 'Review message' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), {
      target: { value: 'Workshop update' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
      target: { value: 'We look forward to seeing you in Accra.' },
    });
    expect(screen.getByText('Workshop update')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Review message' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Workshop update')).toBeVisible();
    expect(mocks.mutate).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send now' }));
    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        subject: 'Workshop update',
        body: 'We look forward to seeing you in Accra.',
        includeMeetingLink: false,
      },
      expect.any(Object),
    );
  });
  it('keeps joining links off and reports history failures separately from empty history', () => {
    mocks.failed = true;
    render(<EventMessages event={event} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByText('No messages yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
