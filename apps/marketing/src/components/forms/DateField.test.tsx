import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/test-utils';

import { DateField } from './DateField';

/** A date question holding its own value, as a form would. */
const Harness = ({
  initial = '',
  clearable = false,
}: {
  initial?: string;
  clearable?: boolean;
}): JSX.Element => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <p id="when-label">When could you start?</p>
      <DateField
        id="when"
        value={value}
        onChange={setValue}
        labelledBy="when-label"
        clearable={clearable}
      />
      <output data-testid="stored">{value}</output>
      <button type="button" onClick={() => setValue('2026-10-05')}>
        Load a saved answer
      </button>
    </>
  );
};

const stored = (): string => screen.getByTestId('stored').textContent ?? '';
const month = (): HTMLElement => screen.getByRole('combobox', { name: /^Month/ });

describe('DateField', () => {
  it('is three labelled parts in one named group, with no browser date or select control', () => {
    const { container } = renderWithProviders(<Harness />);

    const group = screen.getByRole('group', { name: 'When could you start?' });
    expect(within(group).getByLabelText('Day')).toHaveAttribute('inputmode', 'numeric');
    expect(month()).toBeInTheDocument();
    expect(within(group).getByLabelText('Year')).toHaveAttribute('inputmode', 'numeric');
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('input[type="date"]')).toBeNull();
  });

  it('stores YYYY-MM-DD once the day, a month chosen by keyboard, and the year are in', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText('Day'), '28');
    expect(stored()).toBe('--28');

    month().focus();
    await user.keyboard('{Enter}');
    const list = await screen.findByRole('listbox');
    expect(within(list).getAllByRole('option')).toHaveLength(12);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(month()).toHaveTextContent('February');
    expect(month()).toHaveFocus();

    await user.type(screen.getByLabelText('Year'), '2027');
    expect(stored()).toBe('2027-02-28');
  });

  it('lets the month be chosen with the mouse', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(month());
    await user.click(await screen.findByRole('option', { name: 'September' }));
    await user.type(screen.getByLabelText('Day'), '5');
    await user.type(screen.getByLabelText('Year'), '2026');

    expect(month()).toHaveTextContent('September');
    expect(stored()).toBe('2026-09-05');
  });

  it('keeps only digits in the day and year, as many as each holds', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.type(screen.getByLabelText('Day'), 'a1b23');
    await user.type(screen.getByLabelText('Year'), '20x265');

    expect(screen.getByLabelText('Day')).toHaveValue('12');
    expect(screen.getByLabelText('Year')).toHaveValue('2026');
  });

  it('shows a saved answer that arrives after it first appears', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Load a saved answer' }));

    expect(screen.getByLabelText('Day')).toHaveValue('05');
    expect(month()).toHaveTextContent('October');
    expect(screen.getByLabelText('Year')).toHaveValue('2026');
  });

  it('can be cleared when optional, sending focus back to the day', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-10-05" clearable />);

    await user.click(screen.getByRole('button', { name: 'Clear date' }));

    expect(stored()).toBe('');
    expect(screen.getByLabelText('Day')).toHaveValue('');
    expect(screen.getByLabelText('Day')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear date' })).not.toBeInTheDocument();
  });

  it('offers no Clear button for a date that must be given', () => {
    renderWithProviders(<Harness initial="2026-10-05" />);
    expect(screen.queryByRole('button', { name: 'Clear date' })).not.toBeInTheDocument();
  });
});
