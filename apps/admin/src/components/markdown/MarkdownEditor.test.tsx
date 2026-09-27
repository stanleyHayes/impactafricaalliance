import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { MarkdownEditor } from './MarkdownEditor';

// The AI button needs the API; it is not what is under test here.
vi.mock('../ai/AiAssistButton', () => ({ AiAssistButton: () => null }));

afterEach(() => {
  cleanup();
});

const setup = (props: { label?: string; error?: string } = {}): void => {
  render(
    <ThemeProvider theme={theme}>
      <MarkdownEditor value="" onChange={vi.fn()} {...props} />
    </ThemeProvider>,
  );
};

describe('MarkdownEditor', () => {
  it('names the text box by its label, not its placeholder', () => {
    setup({ label: 'Description' });
    const box = screen.getByRole('textbox', { name: 'Description' });
    expect(box).toHaveAccessibleDescription(/Markdown supported/);
    expect(box).not.toHaveAttribute('aria-invalid');
  });

  it('ties an error to the text box, so it is announced with it', () => {
    setup({ label: 'Description', error: 'Keep the description under 20,000 characters.' });
    const box = screen.getByRole('textbox', { name: 'Description' });
    expect(box).toHaveAccessibleDescription('Keep the description under 20,000 characters.');
    expect(box).toHaveAttribute('aria-invalid', 'true');
  });
});
