import type { FieldConfig } from './types';

/** Set on each field's cell in a resource form, to the field's name. */
const FIELD_CELL_ATTRIBUTE = 'data-field';

/** The props that mark a field's cell, so the form can find the field again. */
export const fieldCellProps = (name: string): Record<typeof FIELD_CELL_ATTRIBUTE, string> => ({
  [FIELD_CELL_ATTRIBUTE]: name,
});

/** A date's first empty part (a part holding a value says which), where typing picks up. */
const EMPTY_PART = '[role="spinbutton"]:not([aria-valuenow])';

/** Where a value is typed or chosen: a text box, a date's first part, a dropdown. */
const ENTRY = [
  'input:not([type="hidden"]):not([type="file"]):not([aria-hidden="true"]):not([tabindex="-1"])',
  'textarea',
  '[role="spinbutton"]',
  '[role="combobox"]',
].join(', ');

/** Anything else that takes the keyboard, such as a picture's "Choose from library". */
const TABBABLE = 'button, [href], [tabindex]:not([tabindex="-1"])';

const usable = (element: HTMLElement): boolean =>
  element.closest('[hidden]') === null && !element.matches(':disabled');

const firstUsable = (cell: HTMLElement, selector: string): HTMLElement | undefined =>
  [...cell.querySelectorAll<HTMLElement>(selector)].find(usable);

/** The first of the named fields, in the order the form shows them. */
export const firstNamedField = (
  fields: readonly FieldConfig[],
  names: readonly string[],
): FieldConfig | undefined => fields.find((field) => names.includes(field.name));

/** A field's cell in a form, by the field's name. */
export const fieldCell = (root: ParentNode | null | undefined, name: string): HTMLElement | null =>
  root?.querySelector<HTMLElement>(`[${FIELD_CELL_ATTRIBUTE}="${name}"]`) ?? null;

/**
 * Where the cursor goes in a field that needs attention: the part of a
 * half-typed date still to fill, where a value is entered, or else the
 * field's first button.
 */
export const fieldControl = (cell: HTMLElement): HTMLElement | undefined =>
  firstUsable(cell, EMPTY_PART) ?? firstUsable(cell, ENTRY) ?? firstUsable(cell, TABBABLE);

/**
 * Brings a field into view, its message included, and puts the cursor in it,
 * where nothing sticky covers the form (a dialog's content scrolls under its
 * own header and footer).
 */
export const focusField = (root: ParentNode | null | undefined, name: string): void => {
  const cell = fieldCell(root, name);
  if (!cell) return;
  // Not in a test's DOM, which has no layout.
  cell.scrollIntoView?.({ block: 'nearest' });
  fieldControl(cell)?.focus({ preventScroll: true });
};
