import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';

import { Header } from './Header';

const renderHeader = (path = '/'): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Header />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe('Header', () => {
  it('marks the current primary navigation link as active', () => {
    renderHeader('/impact');

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getByRole('link', { name: 'Impact' })).toHaveClass('active');
    expect(within(navigation).getByRole('link', { name: 'Home' })).not.toHaveClass('active');
  });

  it('opens and closes the mobile navigation', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(mobileNavigation).toBeVisible();
    expect(within(mobileNavigation).getByRole('link', { name: 'News & Stories' })).toBeVisible();

    const closeButton = screen.getByRole('button', { name: 'Close navigation' });
    await user.click(closeButton);
    await waitFor(() => expect(closeButton).not.toBeVisible());
  });
});
