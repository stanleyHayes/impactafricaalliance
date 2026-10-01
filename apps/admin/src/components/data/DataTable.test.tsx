import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { theme } from '../../theme/theme';

import { DataTable } from './DataTable';

afterEach(cleanup);

describe('DataTable with no rows', () => {
  // Centred in a row, anything narrower than the panel shrank to its text and
  // floated in the middle of it; a column stretches it across instead.
  it('stretches the empty state across its panel', () => {
    render(
      <ThemeProvider theme={theme}>
        <DataTable rows={[]} columns={[]} empty={<p>Nothing here yet</p>} />
      </ThemeProvider>,
    );
    const panel = screen.getByText('Nothing here yet').parentElement as HTMLElement;
    const style = getComputedStyle(panel);
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
    expect(style.alignItems).not.toBe('center');
    expect(style.minHeight).toBe('420px');
  });
});
