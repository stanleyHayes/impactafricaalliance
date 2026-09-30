import type { UserRole } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { padBeforeEllipsis, UserMenu } from './UserMenu';

const auth = vi.hoisted(() => ({
  user: { name: '', email: '', role: 'admin' as UserRole },
  logout: vi.fn(),
}));
const startTour = vi.hoisted(() => vi.fn());

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: auth.user, logout: auth.logout }),
}));

vi.mock('../tour', () => ({ useTour: () => ({ start: startTour }) }));

const Address = (): JSX.Element => <output>{useLocation().pathname}</output>;

const renderMenu = (): HTMLElement => {
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/']}>
        <UserMenu />
        <Address />
      </MemoryRouter>
    </ThemeProvider>,
  );
  return screen.getByRole('button', { name: 'Account menu' });
};

/** Opens the menu from the chip; the chip is focused first, as a click would. */
const openMenu = (trigger: HTMLElement): HTMLElement => {
  // Focus updates the button's focus-visible state, so it goes through act.
  act(() => trigger.focus());
  fireEvent.click(trigger);
  return screen.getByRole('menu');
};

describe('the account chip', () => {
  beforeEach(() => {
    auth.user = { name: 'Ama Mensah', email: 'ama@iaa.example', role: 'admin' };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps the id the product tour points at and says it opens a menu', () => {
    const trigger = renderMenu();

    expect(trigger).toHaveAttribute('id', 'admin-user-menu');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    openMenu(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows who is signed in, with their role, and tells a screen reader too', () => {
    const trigger = renderMenu();

    expect(within(trigger).getByText('AM')).toBeInTheDocument();
    expect(within(trigger).getByText('Ama Mensah')).toBeInTheDocument();
    expect(within(trigger).getByText('Admin')).toBeInTheDocument();
    expect(trigger).toHaveAccessibleDescription('Ama Mensah Admin');
  });

  it('lists the account pages and the helpers, with the person at the top', () => {
    const menu = openMenu(renderMenu());

    expect(within(menu).getByText('ama@iaa.example')).toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/^Profile/),
      expect.stringMatching(/^Edit Profile/),
      expect.stringMatching(/^Update Password/),
      expect.stringMatching(/^Settings/),
      expect.stringMatching(/^Show me around/),
      expect.stringMatching(/^User guide/),
      expect.stringMatching(/^Log out/),
    ]);
  });

  it('moves focus into the menu and returns it to the chip on Escape', async () => {
    const trigger = renderMenu();
    openMenu(trigger);

    await waitFor(() => expect(screen.getByRole('menuitem', { name: /^Profile/ })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('goes to the page an item names and closes', async () => {
    const trigger = renderMenu();
    openMenu(trigger);

    fireEvent.click(screen.getByRole('menuitem', { name: /^Update Password/ }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.getByText('/account/password')).toBeInTheDocument());
  });

  it('starts the tour from Show me around', () => {
    openMenu(renderMenu());

    fireEvent.click(screen.getByRole('menuitem', { name: /^Show me around/ }));

    expect(startTour).toHaveBeenCalledOnce();
  });

  it('logs out from the menu', () => {
    const trigger = renderMenu();
    openMenu(trigger);

    fireEvent.click(screen.getByRole('menuitem', { name: /^Log out/ }));

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('labels an editor as an editor, in the chip and in the menu', () => {
    auth.user = {
      name: 'Nana Afua Osimpo Kesewaah Amo',
      email: 'nana@iaa.example',
      role: 'editor',
    };
    const trigger = renderMenu();

    expect(within(trigger).getByText('Editor')).toBeInTheDocument();
    expect(within(trigger).queryByText('Admin')).not.toBeInTheDocument();
    expect(trigger).toHaveAccessibleDescription('Nana Afua Osimpo Kesewaah Amo Editor');

    const menu = openMenu(trigger);
    expect(within(menu).getByText('Editor')).toBeInTheDocument();
  });

  it('keeps a long name on one line and cuts it at a letter, not a word', () => {
    auth.user = { name: 'Ama Oluwaseyifunmilayo', email: 'ama@iaa.example', role: 'admin' };
    const trigger = renderMenu();

    expect(within(trigger).getByText('Ama Oluwaseyifunmilayo')).toHaveStyle({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
  });
});

/** A proportional face: a space 3px, a hyphen 4px, a capital 8px, any other letter 6px. */
const advance = (char: string): number => {
  if (char === ' ') return 3;
  if (char === '-') return 4;
  return char === char.toUpperCase() ? 8 : 6;
};
const ELLIPSIS_WIDTH = 7;
const widthUpTo =
  (text: string) =>
  (end: number): number =>
    [...text.slice(0, end)].reduce((sum, char) => sum + advance(char), 0);

/** What `text-overflow: ellipsis` shows of `text` on a line `width` wide. */
const shown = (text: string, width: number): string => {
  const upTo = widthUpTo(text);
  if (upTo(text.length) <= width) return text;
  let end = text.length;
  while (end > 0 && upTo(end) + ELLIPSIS_WIDTH > width) end -= 1;
  return `${text.slice(0, end)}…`;
};

describe('the ellipsis after the name', () => {
  it('pads nothing when the name fits or the cut falls inside a word', () => {
    const name = 'Ama Oluwaseyifunmilayo';

    expect(padBeforeEllipsis('Ama Mensah', 120, widthUpTo('Ama Mensah'), ELLIPSIS_WIDTH)).toBe(0);
    expect(shown(name, 80)).toBe('Ama Oluwasey…');
    expect(padBeforeEllipsis(name, 80, widthUpTo(name), ELLIPSIS_WIDTH)).toBe(0);
  });

  it('moves a cut that would follow a space or a hyphen back to the end of the word', () => {
    const name = 'Kwabena Asante-Darkwa';
    const width = 100;
    const pad = padBeforeEllipsis(name, width, widthUpTo(name), ELLIPSIS_WIDTH);

    expect(shown(name, width)).toBe('Kwabena Asante-…');
    expect(pad).toBeGreaterThan(0);
    expect(shown(name, width - pad)).toBe('Kwabena Asante…');
  });

  it('only ever drops the space or hyphen, at every width', () => {
    for (const name of ['Nana Afua Osimpo Kesewaah Amo', 'Kwabena Asante-Darkwa', 'Joshua Opoku']) {
      const upTo = widthUpTo(name);
      for (let width = 30; width < upTo(name.length); width += 1) {
        const pad = padBeforeEllipsis(name, width, upTo, ELLIPSIS_WIDTH);

        expect(shown(name, width - pad)).toBe(shown(name, width).replace(/[\s-]+…$/u, '…'));
      }
    }
  });
});
