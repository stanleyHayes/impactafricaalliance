import type { FormField, FormStep } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { FormBuilder } from './FormBuilder';

// The step picture uploader reaches for the API client; nothing here uploads.
vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const field = (id: string, label: string, extra: Partial<FormField> = {}): FormField => ({
  id,
  type: 'short-text',
  label,
  required: false,
  options: [],
  ...extra,
});

const attending = field('attending', 'Attending', {
  type: 'radio',
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ],
});

const Harness = ({
  initial,
  onChange,
}: {
  initial: FormStep[];
  onChange: (steps: FormStep[]) => void;
}): JSX.Element => {
  const [steps, setSteps] = useState(initial);
  return (
    <FormBuilder
      steps={steps}
      onChange={(next) => {
        setSteps(next);
        onChange(next);
      }}
    />
  );
};

const setup = (initial: FormStep[]) => {
  const onChange = vi.fn<(steps: FormStep[]) => void>();
  render(
    <ThemeProvider theme={theme}>
      <Harness initial={initial} onChange={onChange} />
    </ThemeProvider>,
  );
  const latest = (): FormStep[] => onChange.mock.calls.at(-1)?.[0] ?? initial;
  return { onChange, latest };
};

describe('FormBuilder', () => {
  it('adds a question of the chosen type to a step and opens it for editing', () => {
    const { latest } = setup([{ id: 'about', title: 'About you', fields: [] }]);
    fireEvent.click(screen.getByRole('button', { name: 'Add a question to About you' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Email/ }));
    const [step] = latest();
    expect(step?.fields).toHaveLength(1);
    expect(step?.fields[0]).toMatchObject({ type: 'email', label: '' });
    // Opened straight away, with the live preview beside it.
    expect(screen.getByRole('textbox', { name: /^Question/ })).toBeInTheDocument();
    expect(screen.getByText('How applicants see it')).toBeInTheDocument();
  });

  it('reorders questions with the move buttons', () => {
    const { latest } = setup([
      { id: 'about', title: 'About you', fields: [field('name', 'Name'), field('role', 'Role')] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Move Name down' }));
    expect(latest()[0]?.fields.map((item) => item.id)).toEqual(['role', 'name']);
    expect(screen.getByRole('button', { name: 'Move Name down' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Move Name up' }));
    expect(latest()[0]?.fields.map((item) => item.id)).toEqual(['name', 'role']);
  });

  it('only lets a condition use earlier questions, and picks answers from their options', () => {
    const { latest } = setup([
      { id: 'about', title: 'About you', fields: [attending, field('reason', 'Reason')] },
    ]);
    // The first question has nothing before it to depend on.
    fireEvent.click(screen.getByRole('button', { name: /1\. Attending/ }));
    expect(screen.getByText(/always shown/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1\. Attending/ }));

    fireEvent.click(screen.getByRole('button', { name: /2\. Reason/ }));
    fireEvent.click(screen.getByLabelText('Only show this question when…'));
    expect(latest()[0]?.fields[1]?.visibility).toEqual({
      match: 'all',
      rules: [{ fieldId: 'attending', operator: 'equals', value: 'yes' }],
    });

    const condition = screen.getByRole('group', { name: 'Condition 1' });
    fireEvent.mouseDown(within(condition).getByRole('combobox', { name: 'Question' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Attending',
    ]);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    fireEvent.mouseDown(within(condition).getByRole('combobox', { name: 'Answer' }));
    fireEvent.click(screen.getByRole('option', { name: 'No' }));
    expect(latest()[0]?.fields[1]?.visibility?.rules[0]?.value).toBe('no');
  });

  it('keeps option values when their labels are edited', () => {
    const { latest } = setup([{ id: 'about', title: 'About you', fields: [attending] }]);
    fireEvent.click(screen.getByRole('button', { name: /1\. Attending/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Options' }), {
      target: { value: 'Yes, in person\nNo\nOnline only' },
    });
    expect(latest()[0]?.fields[0]?.options).toEqual([
      { value: 'yes', label: 'Yes, in person' },
      { value: 'no', label: 'No' },
      { value: 'online-only', label: 'Online only' },
    ]);
  });

  it('asks before deleting a question, naming it', () => {
    const { latest } = setup([
      { id: 'about', title: 'About you', fields: [field('name', 'Name'), field('role', 'Role')] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Role' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete question' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Role')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete question' }));
    expect(latest()[0]?.fields.map((item) => item.id)).toEqual(['name']);
  });

  it('moves a question to another step, but never into a full one', () => {
    const full = Array.from({ length: 30 }, (_, index) => field(`q${index}`, `Question ${index}`));
    const { latest } = setup([
      { id: 'about', title: 'About you', fields: [field('name', 'Name')] },
      { id: 'more', title: 'More', fields: [] },
      { id: 'packed', title: 'Packed', fields: full },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Name' }));
    expect(screen.getByRole('menuitem', { name: /Packed/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'More' }));
    expect(latest().map((step) => step.fields.map((item) => item.id).join(','))[1]).toBe('name');

    // A full step cannot take a copy of one of its own questions either.
    fireEvent.click(screen.getByRole('button', { name: 'More actions for Question 0' }));
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('lists what would stop the form being published', () => {
    setup([
      {
        id: 'about',
        title: 'About you',
        fields: [field('colour', 'Colour', { type: 'select', options: [] })],
      },
    ]);
    expect(
      screen.getByText('One thing to fix before this form can be published'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('"Colour" needs at least one option to choose from.'),
    ).toBeInTheDocument();
  });

  // The console's Stack once dropped a whole-`sx` function, leaving the step
  // header with no padding, tint or divider.
  it("gives each step's header its padding and divider", () => {
    setup([{ id: 'about', title: 'About you', fields: [field('name', 'Name')] }]);
    const heading = screen.getByRole('heading', { level: 3, name: 'Step 1 of 1: About you' });
    expect(heading.parentElement).toHaveStyle({ paddingTop: '12px', borderBottomWidth: '1px' });
  });

  it('names questions, not their internal ids, while one is moved with the keyboard', async () => {
    setup([
      {
        id: 'about',
        title: 'About you',
        fields: [field('short-text-k2x9q', 'Full name'), field('email-p4v7m', 'Email')],
      },
    ]);
    const handle = screen.getByRole('button', { name: 'Drag to reorder Full name' });
    handle.focus();
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some((region) => region.textContent?.includes('Picked up question 1 of 2, Full name.')),
      ).toBe(true),
    );
    const spoken = screen
      .getAllByRole('status')
      .map((region) => region.textContent ?? '')
      .join(' ');
    expect(spoken).not.toContain('short-text-k2x9q');
    fireEvent.keyDown(handle, { code: 'Escape', key: 'Escape' });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some((region) => region.textContent?.includes('Move cancelled. Full name stays')),
      ).toBe(true),
    );
  });
});
