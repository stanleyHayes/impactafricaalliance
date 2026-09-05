import type { Event } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { CalendarGrid } from './CalendarGrid';
const event = {
  id: 'gathering',
  title: 'Skills in Accra',
  startAt: '2030-01-11T17:00:00Z',
  location: 'Accra',
  type: 'webinar',
} as Event;
describe('calendar discovery', () => {
  it('selects a day, exposes its detail link and clears selection when changing month', () => {
    renderWithProviders(<CalendarGrid events={[event]} />);
    fireEvent.click(screen.getByRole('button', { name: '11 Jan 2030 — 1 events' }));
    expect(screen.getByRole('link', { name: /Skills in Accra/ })).toHaveAttribute(
      'href',
      '/events/gathering',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.queryByRole('button', { name: 'Show month' })).not.toBeInTheDocument();
    expect(screen.getByText('No matching events this month.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to a matching event' }));
    expect(screen.getByRole('link', { name: /Skills in Accra/ })).toBeInTheDocument();
  });
});
