import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { theme } from '../../theme/theme';

import { FormStepNavigation } from './FormStepNavigation';

const STEPS = ['Basics', 'Details', 'Review'] as const;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const setup = (props: { activeStep?: number; maxStep?: number; disabled?: boolean } = {}) => {
  const onStepChange = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <FormStepNavigation
        steps={STEPS}
        activeStep={props.activeStep ?? 1}
        maxStep={props.maxStep ?? 1}
        disabled={props.disabled}
        onStepChange={onStepChange}
      />
    </ThemeProvider>,
  );
  return { ...view, onStepChange };
};

const stepMenu = (): HTMLElement => screen.getByRole('combobox', { name: 'Go to step' });

describe('the phone-width step menu', () => {
  it('is the console’s own menu, not the browser’s native select', () => {
    const { container } = setup();
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('option')).toBeNull();
    expect(stepMenu()).toHaveTextContent('2. Details');
  });

  it('announces the step the reader is on', () => {
    setup();
    const status = screen.getByText('Step 2 of 3 · Details');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('goes back to an earlier step', () => {
    const { onStepChange } = setup();
    fireEvent.mouseDown(stepMenu());
    const listbox = screen.getByRole('listbox');

    fireEvent.click(within(listbox).getByRole('option', { name: /1\. Basics/ }));

    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('shows steps not yet reached but will not open them', () => {
    const { onStepChange } = setup();
    fireEvent.mouseDown(stepMenu());
    const later = within(screen.getByRole('listbox')).getByRole('option', { name: /3\. Review/ });

    expect(later).toHaveAttribute('aria-disabled', 'true');
    expect(later).toHaveTextContent('Opens once the steps before it are complete.');
    fireEvent.click(later);
    expect(onStepChange).not.toHaveBeenCalled();
  });

  it('works from the keyboard, skipping steps that are not open', () => {
    const { onStepChange } = setup();
    fireEvent.keyDown(stepMenu(), { key: 'ArrowDown' });
    const listbox = screen.getByRole('listbox');
    const details = within(listbox).getByRole('option', { name: /2\. Details/ });
    expect(details).toHaveFocus();

    // Review is not open yet, so the arrow cannot land on it.
    fireEvent.keyDown(details, { key: 'ArrowDown' });
    expect(details).toHaveFocus();

    fireEvent.keyDown(details, { key: 'ArrowUp' });
    const basics = within(listbox).getByRole('option', { name: /1\. Basics/ });
    expect(basics).toHaveFocus();
    fireEvent.keyDown(basics, { key: 'Enter' });

    expect(onStepChange).toHaveBeenCalledWith(0);
  });

  it('cannot be used while the form is saving', () => {
    setup({ disabled: true });
    expect(stepMenu()).toHaveAttribute('aria-disabled', 'true');
  });
});
