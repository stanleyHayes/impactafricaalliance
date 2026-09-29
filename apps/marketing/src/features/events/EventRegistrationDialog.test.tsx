import type { Event } from '@iaa/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegisterForEvent } from '../../lib/mutations';
import { renderWithProviders } from '../../test/test-utils';

import { EventRegistrationDialog } from './EventRegistrationDialog';

vi.mock('../../lib/mutations', () => ({ useRegisterForEvent: vi.fn() }));

const mutate = vi.fn();

const event = {
  id: 'event-1',
  title: 'Digital skills webinar',
  questions: [
    {
      id: 'graduated',
      label: 'When did you graduate?',
      type: 'date',
      required: false,
      options: [],
      helpText: 'Leave it out if you are still studying.',
    },
  ],
} as unknown as Event;

const OPTIONAL_CORE_STEPS = 8;

const click = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const answer = (question: string, value: string): void => {
  fireEvent.change(screen.getByRole('textbox', { name: question }), { target: { value } });
};

/** Name and email, then Skip past the optional audience questions. */
const reachDateQuestion = (): void => {
  answer('First, what should we call you?', 'Ama Mensah');
  click('Continue');
  answer('Where should we send your joining link?', 'ama@example.com');
  click('Continue');
  for (let skipped = 0; skipped < OPTIONAL_CORE_STEPS; skipped += 1) {
    click('Skip');
  }
};

const chooseMonth = async (name: string): Promise<void> => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Month/ }));
  fireEvent.click(await screen.findByRole('option', { name }));
};

describe('event registration', () => {
  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(useRegisterForEvent).mockReturnValue({
      mutate,
      reset: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useRegisterForEvent>);
  });

  it('names each answer by its question and shows problems in words tied to it', () => {
    renderWithProviders(<EventRegistrationDialog event={event} open onClose={vi.fn()} />);

    click('Continue');

    const name = screen.getByRole('textbox', { name: 'First, what should we call you?' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('This one we do need.');
  });

  it('asks for a date as Day, Month and Year, never a browser date input', async () => {
    const { baseElement } = renderWithProviders(
      <EventRegistrationDialog event={event} open onClose={vi.fn()} />,
    );
    reachDateQuestion();

    const group = screen.getByRole('group', { name: 'When did you graduate?' });
    expect(group).toHaveAccessibleDescription('Leave it out if you are still studying.');
    expect(within(group).getByLabelText('Day')).toBeInTheDocument();
    expect(within(group).getByLabelText('Year')).toBeInTheDocument();
    expect(baseElement.querySelector('input[type="date"]')).toBeNull();
    expect(baseElement.querySelector('select')).toBeNull();
  });

  it('refuses a day that does not exist, then sends the date as YYYY-MM-DD', async () => {
    renderWithProviders(<EventRegistrationDialog event={event} open onClose={vi.fn()} />);
    reachDateQuestion();

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '31' } });
    await chooseMonth('February');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2027' } });
    click('Continue');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'February 2027 has 28 days. Check the day and month.',
    );
    expect(
      screen.getByRole('group', { name: 'When did you graduate?' }),
    ).toHaveAccessibleDescription(/February 2027 has 28 days/);

    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '28' } });
    // Enter in the day moves on, as it does from any one-line answer.
    fireEvent.keyDown(screen.getByLabelText('Day'), { key: 'Enter' });
    expect(screen.getByText('One last thing.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    click('Complete registration');
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Ama Mensah',
        email: 'ama@example.com',
        answers: [
          { questionId: 'graduated', label: 'When did you graduate?', value: '2027-02-28' },
        ],
      }),
    );
  });

  it('asks for the missing part of a half-typed date', async () => {
    renderWithProviders(<EventRegistrationDialog event={event} open onClose={vi.fn()} />);
    reachDateQuestion();

    await chooseMonth('June');
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2024' } });
    click('Continue');

    expect(screen.getByRole('alert')).toHaveTextContent('The date needs a day.');
  });
});
