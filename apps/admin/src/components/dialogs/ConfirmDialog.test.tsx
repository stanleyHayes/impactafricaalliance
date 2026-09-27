import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

const onConfirm = vi.fn();
const onClose = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const setup = (props: Partial<ConfirmDialogProps> = {}): void => {
  render(
    <ThemeProvider theme={theme}>
      <ConfirmDialog
        open
        title="Delete this document?"
        description={
          <>
            <strong>Budget 2026.xlsx</strong> will be removed from this project.
          </>
        }
        confirmLabel="Delete"
        tone="error"
        onConfirm={onConfirm}
        onClose={onClose}
        {...props}
      />
    </ThemeProvider>,
  );
};

describe('ConfirmDialog', () => {
  it('names the record and runs the action when confirmed', () => {
    setup();
    const dialog = screen.getByRole('dialog', { name: 'Delete this document?' });
    expect(dialog).toHaveTextContent('Budget 2026.xlsx will be removed from this project.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without acting when cancelled', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cannot be confirmed twice while the action runs', () => {
    setup({ pending: true, pendingLabel: 'Deleting…' });
    const button = screen.getByRole('button', { name: 'Deleting…' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('says why the last attempt failed', () => {
    setup({ error: 'The server could not be reached.' });
    expect(screen.getByRole('alert')).toHaveTextContent('The server could not be reached.');
  });
});
