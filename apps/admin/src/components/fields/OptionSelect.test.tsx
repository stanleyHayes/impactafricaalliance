import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { OptionSelect } from './OptionSelect';

afterEach(() => {
  cleanup();
});

/** The label MUI draws for the select, found through the combobox it names. */
const labelOf = (name: string): HTMLElement => {
  const combobox = screen.getByRole('combobox', { name });
  const label = document.getElementById(combobox.getAttribute('aria-labelledby') ?? '');
  if (!label) throw new Error(`No label for ${name}`);
  return label;
};

const OPTIONS = [
  { value: '', label: 'Any priority' },
  { value: 'high', label: 'High' },
];

describe('OptionSelect', () => {
  it('keeps the label in the outline while the placeholder shows', () => {
    render(
      <ThemeProvider theme={theme}>
        <OptionSelect
          label="Priority"
          value=""
          placeholder="Any priority"
          options={OPTIONS.slice(1)}
          onChange={vi.fn()}
        />
      </ThemeProvider>,
    );
    // Shrunk, so it cannot be drawn over "Any priority" inside the box.
    const label = labelOf('Priority');
    expect(label).toHaveAttribute('data-shrink', 'true');
    expect(label).toHaveClass('MuiInputLabel-shrink');
    expect(screen.getByText('Any priority')).toBeInTheDocument();
    // The outline leaves a gap for it.
    expect(
      document.querySelector('.MuiOutlinedInput-notchedOutline legend > span'),
    ).toHaveTextContent('Priority');
  });

  it('keeps the label in the outline once a value is chosen', () => {
    render(
      <ThemeProvider theme={theme}>
        <OptionSelect label="Priority" value="high" options={OPTIONS} onChange={vi.fn()} />
      </ThemeProvider>,
    );
    expect(labelOf('Priority')).toHaveAttribute('data-shrink', 'true');
  });
});
