import type { EventQuestion } from '@iaa/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { QuestionBuilder } from './QuestionBuilder';

const first: EventQuestion = {
  id: 'access',
  label: 'What would help you attend?',
  type: 'single-choice',
  required: false,
  options: ['Step-free access'],
  helpText: 'Tell us what you need.',
};
const second: EventQuestion = {
  id: 'interest',
  label: 'What are you interested in?',
  type: 'short-text',
  required: true,
  options: [],
};
const Harness = (): JSX.Element => {
  const [questions, setQuestions] = useState([first, second]);
  return (
    <>
      <QuestionBuilder label="Event questions" value={questions} onChange={setQuestions} />
      <output data-testid="questions">{JSON.stringify(questions)}</output>
    </>
  );
};

describe('QuestionBuilder', () => {
  it('preserves line breaks while typing choices and updates the attendee preview', () => {
    render(<Harness />);
    const choices = screen.getByLabelText('Choices');
    fireEvent.focus(choices);
    fireEvent.change(choices, { target: { value: 'Step-free access\n' } });
    expect(choices).toHaveValue('Step-free access\n');
    fireEvent.change(choices, { target: { value: 'Step-free access\nLive captions' } });
    fireEvent.blur(choices);
    const preview = screen.getByRole('complementary', { name: 'Preview question 1' });
    expect(within(preview).getByText('Live captions')).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('questions').textContent ?? '[]')[0].options).toEqual([
      'Step-free access',
      'Live captions',
    ]);
  });

  it('moves complete questions with their settings, then removes only the selected question', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Move question 1 down' }));
    expect(JSON.parse(screen.getByTestId('questions').textContent ?? '[]')).toEqual([
      second,
      first,
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove question 1' }));
    expect(JSON.parse(screen.getByTestId('questions').textContent ?? '[]')).toEqual([first]);
    expect(screen.getByRole('button', { name: 'Move question 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move question 1 down' })).toBeDisabled();
  });
});
