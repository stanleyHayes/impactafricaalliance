import type { AnswerValue, FormField } from '@iaa/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../../test/test-utils';
import type { AnswerUpdate } from '../session-state';

import { QuestionField } from './QuestionField';

const years: FormField = {
  id: 'years',
  type: 'number',
  label: 'Years of experience',
  required: false,
  options: [],
};

/** A question holding its own answer, as the flow's state would. */
const Harness = ({ field }: { field: FormField }): JSX.Element => {
  const [value, setValue] = useState<AnswerValue | undefined>(undefined);
  const onChange = (_fieldId: string, update: AnswerUpdate): void =>
    setValue((previous) => (typeof update === 'function' ? update(previous) : update));
  return (
    <>
      <QuestionField field={field} value={value} error={undefined} onChange={onChange} />
      <output data-testid="stored">{JSON.stringify(value ?? null)}</output>
    </>
  );
};

describe('number questions', () => {
  it('lets a decimal be typed digit by digit, storing a number', () => {
    renderWithProviders(<Harness field={years} />);
    const input = screen.getByLabelText('Years of experience');

    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.change(input, { target: { value: '1.0' } });
    // "1.0" is the number 1; the text must not snap back to "1" mid-typing.
    expect(input).toHaveValue(1);
    expect((input as HTMLInputElement).value).toBe('1.0');

    fireEvent.change(input, { target: { value: '1.05' } });
    expect((input as HTMLInputElement).value).toBe('1.05');
    expect(screen.getByTestId('stored')).toHaveTextContent('1.05');

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('stored')).toHaveTextContent('null');
  });
});

const startDate: FormField = {
  id: 'start',
  type: 'date',
  label: 'When could you start?',
  required: false,
  options: [],
  helpText: 'An approximate date is fine.',
};

describe('date questions', () => {
  it('asks for Day, Month and Year under the question, not a browser date input', () => {
    const { container } = renderWithProviders(<Harness field={startDate} />);

    const group = screen.getByRole('group', { name: 'When could you start?' });
    expect(group).toHaveAccessibleDescription('An approximate date is fine.');
    expect(within(group).getByLabelText('Day')).toHaveAttribute('id', 'field-start');
    expect(within(group).getByRole('combobox', { name: /^Month/ })).toBeInTheDocument();
    expect(within(group).getByLabelText('Year')).toBeInTheDocument();
    expect(container.querySelector('input[type="date"]')).toBeNull();
  });

  it('stores the date as YYYY-MM-DD, and can be cleared when optional', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness field={startDate} />);

    await user.type(screen.getByLabelText('Day'), '9');
    await user.click(screen.getByRole('combobox', { name: /^Month/ }));
    await user.click(await screen.findByRole('option', { name: 'March' }));
    await user.type(screen.getByLabelText('Year'), '2027');
    expect(screen.getByTestId('stored')).toHaveTextContent('"2027-03-09"');

    await user.click(screen.getByRole('button', { name: 'Clear date' }));
    expect(screen.getByTestId('stored')).toHaveTextContent('""');
  });

  it('lets Enter in the day or year move the step on, like any one-line answer', () => {
    renderWithProviders(<Harness field={startDate} />);
    expect(screen.getByLabelText('Day')).toHaveAttribute('data-enter-advances', 'true');
    expect(screen.getByLabelText('Year')).toHaveAttribute('data-enter-advances', 'true');
  });
});
