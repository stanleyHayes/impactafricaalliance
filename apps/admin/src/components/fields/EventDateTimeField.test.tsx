import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { IsoDateTimeField } from './EventDateTimeField';

const INCOMPLETE = 'Finish typing the date and time, or clear the field.';
const onChange = vi.fn();
const onProblemChange = vi.fn();
// 9:30 in the morning wherever the tests run, so the parts read the same everywhere.
const saved = dayjs('2026-10-05T09:30:00').toISOString();

beforeEach(() => {
  // Desktop mode, where the parts of the date are typed in the field.
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

/** The field in a form that keeps what it reports, as a CMS edit page does. */
const Harness = ({ initial }: { initial: string | null }): JSX.Element => {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <IsoDateTimeField
      label="Deadline"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      onProblemChange={onProblemChange}
    />
  );
};

const setup = (initial: string | null = saved) =>
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <Harness initial={initial} />
      </LocalizationProvider>
    </ThemeProvider>,
  );

const deleteYear = (): HTMLElement => {
  const year = screen.getByRole('spinbutton', { name: 'Year' });
  fireEvent.mouseDown(year);
  fireEvent.keyDown(year, { key: 'Delete' });
  return year;
};

describe('IsoDateTimeField', () => {
  it('shows the saved moment on a 12-hour clock', () => {
    setup();
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('05');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('2026');
    expect(screen.getByRole('spinbutton', { name: 'Hours' })).toHaveTextContent('09');
    expect(screen.getByRole('spinbutton', { name: 'Meridiem' })).toHaveTextContent('AM');
  });

  // Deleting one part used to reach the form as null, and the next save
  // removed the stored date.
  it('keeps the saved date while only the year is deleted, and says so', async () => {
    setup();
    deleteYear();
    expect(await screen.findByText(INCOMPLETE)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(onProblemChange).toHaveBeenLastCalledWith(INCOMPLETE);
    // The other parts stay as they were.
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('05');
  });

  it('passes on a year typed over the deleted one, and withdraws the problem', async () => {
    setup();
    const year = deleteYear();
    await screen.findByText(INCOMPLETE);
    for (const digit of ['2', '0', '2', '7']) {
      year.textContent = digit;
      fireEvent.input(year);
    }
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(onChange).toHaveBeenLastCalledWith(dayjs('2027-10-05T09:30:00').toISOString());
    expect(onProblemChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });

  it('sends null when the reader clears the field, even after deleting a part', async () => {
    setup();
    deleteYear();
    await screen.findByText(INCOMPLETE);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(onProblemChange).toHaveBeenLastCalledWith(null);
  });

  // Selecting the whole date and deleting it is as deliberate as the clear button.
  it('sends null when every part is deleted at once', async () => {
    setup();
    const year = screen.getByRole('spinbutton', { name: 'Year' });
    fireEvent.mouseDown(year);
    fireEvent.keyDown(year, { key: 'a', ctrlKey: true });
    // Everything is selected: the whole field, now focused, takes the key.
    fireEvent.keyDown(document.activeElement as Element, { key: 'Delete' });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
    expect(onProblemChange).not.toHaveBeenCalledWith(INCOMPLETE);
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });

  // The picker reports text it cannot read as a date as null, like a clear.
  it('keeps the saved date when text that is not a date is pasted over it', async () => {
    setup();
    const year = screen.getByRole('spinbutton', { name: 'Year' });
    fireEvent.mouseDown(year);
    fireEvent.keyDown(year, { key: 'a', ctrlKey: true });
    const field = document.activeElement as Element;
    fireEvent.paste(field, { clipboardData: { getData: () => 'next Tuesday' } });
    await waitFor(() => expect(field).toHaveTextContent('05 Oct 2026, 09:30 AM'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument();
  });

  // Nothing is passed on until the date is whole, so leaving it half typed
  // must hold the form back rather than quietly save no date.
  it('asks for the rest of a date begun in an empty field once it is left', async () => {
    setup(null);
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    day.textContent = '5';
    fireEvent.input(day);
    fireEvent.focusOut(day, { relatedTarget: document.body });
    expect(await screen.findByText(INCOMPLETE)).toBeInTheDocument();
    expect(onProblemChange).toHaveBeenLastCalledWith(INCOMPLETE);
    expect(onChange).not.toHaveBeenCalled();
  });

  // The picker says nothing about parts typed into an empty field. The words
  // used to appear only as the field was left, which pushed the buttons
  // below it down between the press and release of a click on Continue, so
  // the click missed. Now they appear as it is typed, quietly, and leaving
  // only turns them red.
  it('asks for the rest while a date is typed into an empty field, as a hint', async () => {
    setup(null);
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    day.textContent = '5';
    fireEvent.input(day);
    fireEvent.keyUp(day, { key: '5' });
    const hint = await screen.findByText(INCOMPLETE);
    expect(hint).not.toHaveClass('Mui-error');
    // The form is held back already, before the field is left.
    expect(onProblemChange).toHaveBeenLastCalledWith(INCOMPLETE);

    fireEvent.focusOut(day, { relatedTarget: document.body });
    await waitFor(() => expect(screen.getByText(INCOMPLETE)).toHaveClass('Mui-error'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('withdraws the hint when the typed parts are deleted again', async () => {
    setup(null);
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    fireEvent.mouseDown(day);
    day.textContent = '5';
    fireEvent.input(day);
    fireEvent.keyUp(day, { key: '5' });
    await screen.findByText(INCOMPLETE);
    // The picker moved on to Month after the day was typed: back to Day to delete it.
    fireEvent.mouseDown(day);
    fireEvent.keyDown(day, { key: 'Delete' });
    fireEvent.keyUp(day, { key: 'Delete' });
    await waitFor(() => expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument());
    expect(onProblemChange).toHaveBeenLastCalledWith(null);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('withdraws its problem when it leaves the screen', async () => {
    const { unmount } = setup();
    deleteYear();
    await screen.findByText(INCOMPLETE);
    unmount();
    expect(onProblemChange).toHaveBeenLastCalledWith(null);
  });
});
