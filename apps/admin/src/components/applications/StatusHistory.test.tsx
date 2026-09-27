import { UserRole, type ApplicationStatusChange } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { formatInstant } from '../../lib/forms';
import { theme } from '../../theme/theme';

import { StatusHistory } from './StatusHistory';

afterEach(cleanup);

const history: ApplicationStatusChange[] = [
  { from: 'draft', to: 'submitted', by: null, at: '2026-09-20T10:00:00.000Z' },
  {
    from: 'submitted',
    to: 'under-review',
    note: 'Strong topic fit.',
    by: { id: 'u1', name: 'Visual Admin', email: 'admin@iaa.org', role: UserRole.Admin },
    at: '2026-09-27T13:37:00.000Z',
  },
];

/** Every rule emotion has written so far; jsdom cannot compute a pseudo-element's style. */
const emotionRules = (): string =>
  [...document.querySelectorAll('style[data-emotion]')].map((tag) => tag.textContent).join('');

describe('StatusHistory', () => {
  it('shows who moved the application, when, and why, newest first', () => {
    render(
      <ThemeProvider theme={theme}>
        <StatusHistory history={history} />
      </ThemeProvider>,
    );
    const entries = within(screen.getByRole('list', { name: 'Status history' })).getAllByRole(
      'listitem',
    );
    expect(entries[0]).toHaveTextContent('Visual Admin moved it from Submitted to Under review.');
    expect(within(entries[0]!).getByText('“Strong topic fit.”')).toBeInTheDocument();
    expect(within(entries[0]!).getByText(formatInstant(history[1]!.at))).toHaveAttribute(
      'dateTime',
      history[1]!.at,
    );
    expect(entries[1]).toHaveTextContent('The applicant submitted the application.');
  });

  // `sx` reads a bare `width: 1` as 100%, which laid the rail over every entry.
  it('draws the rail between dots one pixel wide, never across the entry', () => {
    render(
      <ThemeProvider theme={theme}>
        <StatusHistory history={history} />
      </ThemeProvider>,
    );
    const rules = emotionRules();
    const rail = /:not\(:last-of-type\)::after\{[^}]*\}/.exec(rules)?.[0] ?? '';
    expect(rail).toContain('width:1px');
    expect(rules).not.toContain('width:100%');
  });
});
