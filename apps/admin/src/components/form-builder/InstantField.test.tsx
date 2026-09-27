import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { InstantField } from './InstantField';

const onChange = vi.fn();
const onProblemChange = vi.fn();
// 9:30 in the morning wherever the tests run, so the parts read the same everywhere.
const saved = dayjs('2026-10-05T09:30:00').toISOString();

beforeEach(() => {
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
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const setup = (value: string | null = saved): void => {
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <InstantField
          label="Opens at"
          value={value}
          onChange={onChange}
          onProblemChange={onProblemChange}
        />
      </LocalizationProvider>
    </ThemeProvider>,
  );
};

describe('InstantField', () => {
  it('shows the saved moment on a 12-hour clock', () => {
    setup();
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('05');
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveTextContent('09');
    expect(screen.getByRole('spinbutton', { name: 'Meridiem' })).toHaveTextContent('AM');
  });

  it('sends null only when the reader clears the field', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('keeps the saved moment while a new one is only half typed, and says so', async () => {
    setup();
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    expect(onChange).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Finish typing the date and time, or clear the field.'),
    ).toBeInTheDocument();
    expect(onProblemChange).toHaveBeenLastCalledWith(
      'Finish typing the date and time, or clear the field.',
    );
  });
});
