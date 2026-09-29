import type { FormField } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { FieldPreview } from './FieldPreview';

beforeEach(() => {
  // Desktop mode, so the calendar opens in a popper as it does for staff.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const dateQuestion: FormField = {
  id: 'q-date',
  type: 'date',
  label: 'Date of birth',
  required: true,
  options: [],
};

describe('a date question in the form builder', () => {
  it('previews with the console’s calendar, not the browser’s date input', async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <FieldPreview field={dateQuestion} />
        </LocalizationProvider>
      </ThemeProvider>,
    );

    expect(container.querySelector('input[type="date"]')).toBeNull();
    const preview = screen.getByRole('group', { name: 'Preview of Date of birth' });
    expect(within(preview).getByRole('spinbutton', { name: 'Day' })).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole('button', { name: /Choose date/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
