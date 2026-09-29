import type { AnswerValue, FormField } from '@iaa/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../../test/test-utils';
import type { AnswerUpdate } from '../session-state';

import { QuestionField } from './QuestionField';

const COUNTRIES = [
  'Benin',
  'Burkina Faso',
  'Cameroon',
  "Côte d'Ivoire",
  'Gambia',
  'Ghana',
  'Kenya',
  'Liberia',
  'Nigeria',
  'Senegal',
  'Sierra Leone',
  'Togo',
];

const country: FormField = {
  id: 'country',
  type: 'select',
  label: 'Which country are you in?',
  required: true,
  options: COUNTRIES.map((label) => ({ value: label.toLowerCase().replace(/\W+/g, '-'), label })),
};

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

const stored = (): string => screen.getByTestId('stored').textContent ?? '';

describe('select questions with a long list', () => {
  it('uses a searchable list named by the question, never the browser dropdown', () => {
    const { container } = renderWithProviders(<Harness field={country} />);

    const input = screen.getByRole('combobox', { name: /Which country are you in\?/ });
    expect(input).toHaveAttribute('id', 'field-country');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(container.querySelector('select')).toBeNull();
  });

  it('narrows the list as the applicant types and chooses with the keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness field={country} />);
    const input = screen.getByRole('combobox', { name: /Which country/ });

    await user.type(input, 'gh');
    const list = screen.getByRole('listbox');
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Ghana']);
    // The list is open, so Enter chooses rather than moving the step on.
    expect(input).not.toHaveAttribute('data-enter-advances');
    await user.keyboard('{Enter}');

    expect(stored()).toBe('"ghana"');
    expect(input).toHaveValue('Ghana');
    expect(input).toHaveAttribute('data-enter-advances', 'true');
  });

  it('moves through the whole list with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness field={country} />);
    const input = screen.getByRole('combobox', { name: /Which country/ });

    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(12);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(stored()).toBe('"cameroon"');
  });

  it('chooses with a tap or click, marks the choice, and can be cleared', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness field={country} />);

    await user.click(screen.getByRole('button', { name: 'Show the options' }));
    await user.click(screen.getByRole('option', { name: 'Senegal' }));
    expect(stored()).toBe('"senegal"');

    await user.click(screen.getByRole('button', { name: 'Show the options' }));
    expect(screen.getByRole('option', { name: 'Senegal' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Clear answer' }));
    expect(stored()).toBe('""');
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness field={country} />);

    await user.type(screen.getByRole('combobox', { name: /Which country/ }), 'zz');

    expect(screen.getByText(/Nothing matches that/)).toBeInTheDocument();
  });

  it('keeps large option cards for a short list', () => {
    renderWithProviders(<Harness field={{ ...country, options: country.options.slice(0, 4) }} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});
