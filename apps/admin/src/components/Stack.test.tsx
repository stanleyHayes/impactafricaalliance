import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '../theme/theme';

import { Stack } from './Stack';

afterEach(cleanup);

const renderStack = (element: JSX.Element): HTMLElement => {
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);
  return screen.getByTestId('stack');
};

describe('Stack', () => {
  it('passes its layout props through as styles', () => {
    const stack = renderStack(
      <Stack data-testid="stack" alignItems="center" justifyContent="space-between" gap={2}>
        x
      </Stack>,
    );
    expect(stack).toHaveStyle({
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    });
  });

  // Spreading a function into an object yields nothing, which silently
  // dropped every style of the form builder's step header.
  it('keeps the styles of an sx written as a function of the theme', () => {
    const stack = renderStack(
      <Stack data-testid="stack" alignItems="center" sx={(t) => ({ paddingTop: t.spacing(4) })}>
        x
      </Stack>,
    );
    expect(stack).toHaveStyle({ paddingTop: '32px', alignItems: 'center' });
  });

  it('keeps the styles of an sx written as an array, the later ones winning', () => {
    const stack = renderStack(
      <Stack data-testid="stack" sx={[{ paddingTop: '4px' }, { paddingTop: '8px', gap: '2px' }]}>
        x
      </Stack>,
    );
    expect(stack).toHaveStyle({ paddingTop: '8px', gap: '2px' });
  });

  it("lets the caller's sx win over a layout prop", () => {
    const stack = renderStack(
      <Stack data-testid="stack" alignItems="center" sx={{ alignItems: 'flex-end' }}>
        x
      </Stack>,
    );
    expect(stack).toHaveStyle({ alignItems: 'flex-end' });
  });
});
