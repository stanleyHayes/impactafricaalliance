import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import 'dayjs/locale/en-gb';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { DateField } from './DateField';

const onChange = vi.fn();

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
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const setup = (value: string | null = '2026-10-05T12:00:00.000Z'): void => {
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <DateField label="Due date" value={value} onChange={onChange} />
      </LocalizationProvider>
    </ThemeProvider>,
  );
};

describe('DateField', () => {
  it('shows the stored calendar day', () => {
    setup();
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('05');
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveTextContent('Oct');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('2026');
  });

  it('sends a picked day as noon UTC on that day', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Choose date/ }));
    const calendar = await screen.findByRole('dialog');
    fireEvent.click(within(calendar).getByRole('gridcell', { name: '12' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-12T12:00:00.000Z');
  });

  it('sends null when the date is cleared', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('still clears after part of the date was deleted', () => {
    setup();
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('YYYY');
  });

  it('keeps the saved date while a new one is only half typed', async () => {
    setup();
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    expect(day).toHaveTextContent('DD');
    expect(onChange).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Finish typing the date, or clear the field.'),
    ).toBeInTheDocument();
  });

  it('passes on a new day typed over a deleted one', () => {
    const Harness = (): JSX.Element => {
      const [value, setValue] = useState<string | null>('2026-10-05T12:00:00.000Z');
      return (
        <DateField
          label="Due date"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    };
    render(
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <Harness />
        </LocalizationProvider>
      </ThemeProvider>,
    );
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    for (const digit of ['1', '2']) {
      day.textContent = digit;
      fireEvent.input(day);
    }
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-12T12:00:00.000Z');
    expect(day).toHaveTextContent('12');
  });

  it('can be left empty', () => {
    setup(null);
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('DD');
    expect(onChange).not.toHaveBeenCalled();
  });
});
