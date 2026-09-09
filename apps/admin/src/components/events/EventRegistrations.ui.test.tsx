import type { EventRegistration } from '@iaa/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEventRegistrations } from '../../lib/admin-hooks';

import { EventRegistrations } from './EventRegistrations';

vi.mock('../../lib/admin-hooks', () => ({ useEventRegistrations: vi.fn() }));
const refetch = vi.fn();
const attendee = {
  id: 'r1',
  fullName: 'Ama Mensah',
  email: 'ama@example.com',
  country: 'Ghana',
  createdAt: '2026-09-08T10:00:00Z',
  answers: [{ questionId: 'q1', label: 'Interests', value: ['STEM', 'Enterprise'] }],
} as EventRegistration;
const result = (overrides = {}) => ({
  data: { items: [attendee], total: 26, totalPages: 2 },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch,
  ...overrides,
});
const mount = () => render(<EventRegistrations eventId="e1" eventTitle="Career workshop" />);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useEventRegistrations).mockReturnValue(
    result() as unknown as ReturnType<typeof useEventRegistrations>,
  );
});

describe('registration directory', () => {
  it('opens attendee responses and requests the next page', () => {
    const { container } = mount();
    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    fireEvent.click(summary!);
    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText('STEM; Enterprise')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(useEventRegistrations).toHaveBeenLastCalledWith('e1', 2);
  });
  it('offers retry and prevents exporting stale data after a failure', () => {
    vi.mocked(useEventRegistrations).mockReturnValue(
      result({ isError: true }) as unknown as ReturnType<typeof useEventRegistrations>,
    );
    mount();
    expect(screen.getByRole('button', { name: 'Export this page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
  it('explains an empty list and disables export', () => {
    vi.mocked(useEventRegistrations).mockReturnValue(
      result({ data: { items: [], total: 0, totalPages: 1 } }) as unknown as ReturnType<
        typeof useEventRegistrations
      >,
    );
    mount();
    expect(screen.getByText('Nobody has registered yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export this page' })).toBeDisabled();
  });
});
