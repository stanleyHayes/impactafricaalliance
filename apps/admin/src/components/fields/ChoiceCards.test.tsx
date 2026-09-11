import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceCards } from './ChoiceCards';
import { OptionSelect } from './OptionSelect';

const TONES = [
  { value: 'announcement', label: 'Announcement', description: 'The house gold.' },
  { value: 'warning', label: 'Warning', description: 'For a deadline people must not miss.' },
];

describe('choosing by looking', () => {
  it('exposes each card as a radio, with the current one checked', () => {
    render(
      <ChoiceCards label="Banner colour" options={TONES} value="warning" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('radio', { name: /Announcement/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Warning/ })).toBeChecked();
  });

  it('reports the choice when a card is clicked', () => {
    const onChange = vi.fn();
    render(
      <ChoiceCards label="Banner colour" options={TONES} value="announcement" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Warning/ }));
    expect(onChange).toHaveBeenCalledWith('warning');
  });

  it('names the selection, so the choice is legible without counting borders', () => {
    render(
      <ChoiceCards label="Banner colour" options={TONES} value="warning" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Warning selected');
  });

  it('shows every description, which is the point of the layout', () => {
    render(
      <ChoiceCards label="Banner colour" options={TONES} value="warning" onChange={vi.fn()} />,
    );
    expect(screen.getByText('The house gold.')).toBeVisible();
    expect(screen.getByText('For a deadline people must not miss.')).toBeVisible();
  });
});

describe('a dropdown whose options explain themselves', () => {
  it('shows only the label in the closed field, and the description in the menu', () => {
    render(<OptionSelect label="Tone" options={TONES} value="warning" onChange={vi.fn()} />);

    // Closed: the value, not the explanation for it.
    expect(screen.queryByText('For a deadline people must not miss.')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Tone' }));
    expect(screen.getByText('For a deadline people must not miss.')).toBeVisible();
    expect(screen.getByText('The house gold.')).toBeVisible();
  });

  it('reports the chosen value', () => {
    const onChange = vi.fn();
    render(<OptionSelect label="Tone" options={TONES} value="warning" onChange={onChange} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Tone' }));
    fireEvent.click(screen.getByRole('option', { name: /^Announcement/ }));
    expect(onChange).toHaveBeenCalledWith('announcement');
  });

  it('falls back to the placeholder when nothing is chosen yet', () => {
    render(
      <OptionSelect
        label="Tone"
        options={TONES}
        value=""
        onChange={vi.fn()}
        placeholder="All tones"
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Tone' })).toHaveTextContent('All tones');
  });
});
