import type { ResourceConfig, ResourceRow } from './types';

/** Row keys that hold what a record is called, in the order they are trusted. */
const NAME_KEYS = ['name', 'title', 'label'] as const;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * What a record is called, for sentences such as "Ama Mensah will be deleted".
 *
 * A confirmation that says "Delete this item?" leaves the reader to remember
 * which row they clicked, and in a grid of look-alike cards that is how the
 * wrong one goes. So the record is named: its own name, title or label where it
 * has one (a popup keeps its list name in `name` and its public heading in
 * `title`, and the list name is what the team knows it by). Records without any
 * of those, such as a pillar image, are identified by the first field in their
 * form that holds a value, since the registry lists the identifying field
 * first; a select shows the label people chose, not the stored key.
 *
 * Null when nothing identifies the record, so the caller can fall back to
 * "this team member" rather than printing an empty name.
 */
export const recordName = (
  resource: Pick<ResourceConfig, 'fields'>,
  row: ResourceRow,
): string | null => {
  for (const key of NAME_KEYS) {
    const value = text(row[key]);
    if (value) return value;
  }
  for (const field of resource.fields) {
    if (field.type !== 'text' && field.type !== 'select') continue;
    const value = text(row[field.name]);
    if (!value) continue;
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return null;
};
