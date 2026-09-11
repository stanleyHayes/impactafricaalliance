import type { SitePopup } from '@iaa/shared';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLivePopup } from '../../lib/content-hooks';
import { renderWithProviders } from '../../test/test-utils';

import { WelcomePopup } from './WelcomePopup';

vi.mock('../../lib/content-hooks', () => ({ useLivePopup: vi.fn() }));

/** The launch popup exactly as it is stored, so the test tracks the real record. */
const launchPopup: SitePopup = {
  id: 'p1',
  name: 'Accra launch (date to confirm)',
  title: 'We launch on 8 October.',
  message:
    'Impact Africa Alliance goes live at the Google Community Centre in Accra, supported by Google Africa. Our mentorship webinars are open for registration now.',
  ctaLabel: 'See upcoming events',
  ctaUrl: 'https://www.impactafricaalliance.org/events',
  delaySeconds: 3,
  isActive: true,
  priority: 0,
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
};

const render = (popup: SitePopup | null): void => {
  vi.mocked(useLivePopup).mockReturnValue({ data: popup } as ReturnType<typeof useLivePopup>);
  renderWithProviders(<WelcomePopup />);
};

beforeEach(() => {
  // The component guards every storage call, so this environment having none
  // is the "privacy mode" path rather than something the test must set up.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the welcome popup', () => {
  it('shows the launch copy once its delay has elapsed', async () => {
    render(launchPopup);

    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByText('We launch on 8 October.')).toBeInTheDocument();
    expect(screen.getByText(/Google Community Centre in Accra/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See upcoming events' })).toHaveAttribute(
      'href',
      'https://www.impactafricaalliance.org/events',
    );
  });

  it('waits out the delay rather than landing mid-page-load', async () => {
    render(launchPopup);

    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });

    // Three seconds is what the record asks for; arriving at two would be the
    // interruption the delay exists to avoid.
    expect(screen.queryByText('We launch on 8 October.')).not.toBeInTheDocument();
  });

  it('shows nothing at all when no popup is live', async () => {
    render(null);

    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
