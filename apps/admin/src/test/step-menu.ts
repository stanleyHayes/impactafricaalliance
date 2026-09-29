import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Chooses a step from the phone-width "Go to step" menu the way a reader
 * does: open the menu, pick the numbered step, and wait for the menu to go.
 *
 * The menu is the console's own `OptionSelect`, not a native select, so there
 * is no `<select>` whose value a test can change. Waiting for it to close
 * matters: while the menu is open the page behind it is hidden from assistive
 * technology, and so from the next `getByRole`.
 *
 * `index` counts from zero, as the steps array does.
 */
export const goToStep = async (index: number): Promise<void> => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Go to step' }));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: new RegExp(`^${index + 1}\\. `) }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
};
