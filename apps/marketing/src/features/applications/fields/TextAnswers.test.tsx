import type { AnswerValue, FormField } from '@iaa/shared';
import { fireEvent, screen } from '@testing-library/react';
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
