import type { ProjectRef } from '@iaa/shared';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useMemo, useState } from 'react';

import { useHasPermission } from '../../auth/useCan';
import { useStoryProjectSearch } from '../../lib/impact-stories';
import { useDebouncedValue } from '../../lib/use-debounced-value';

export interface ProjectPickerProps {
  value: ProjectRef | null;
  onChange: (project: ProjectRef | null) => void;
  disabled?: boolean;
  error?: string;
  size?: 'small' | 'medium';
  /** Replaces the explanation under the field; null for none, as in a filter bar. */
  helperText?: string | null;
}

const LINK_HELP = 'Optional. Links the story to the project it tells; nothing is copied.';

/**
 * Which project a story tells. Searches the projects list as you type.
 *
 * Choosing a project only links the two, so the story can be found from the
 * project; nothing is copied. Someone who cannot read projects sees the link
 * but cannot change it, and is told who can grant access.
 */
export const ProjectPicker = ({
  value,
  onChange,
  disabled = false,
  error,
  size,
  helperText = LINK_HELP,
}: ProjectPickerProps): JSX.Element => {
  const canReadProjects = useHasPermission('read', 'projects');
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const term = useDebouncedValue(input, 250);
  // Only search while the list is open: most visits to this step never change the project.
  const search = useStoryProjectSearch(term, canReadProjects && open);
  const options = useMemo<ProjectRef[]>(() => {
    const found = (search.data?.items ?? []).map(({ id, title, slug }) => ({ id, title, slug }));
    return value && !found.some((project) => project.id === value.id) ? [value, ...found] : found;
  }, [search.data, value]);

  if (!canReadProjects) {
    return (
      <TextField
        label="Project"
        value={value?.title ?? 'No project linked'}
        disabled
        fullWidth
        size={size}
        helperText="You need access to projects to change this. An administrator can grant it under Users."
      />
    );
  }

  return (
    <Autocomplete<ProjectRef, false, false, false>
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      value={value}
      onChange={(_event, next) => onChange(next)}
      inputValue={input}
      onInputChange={(_event, next) => setInput(next)}
      // The API has already matched the search; filtering again here would hide results.
      filterOptions={(candidates) => candidates}
      getOptionLabel={(option) => option.title}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      loading={search.isFetching}
      loadingText="Searching projects…"
      noOptionsText={term ? 'No projects match that search.' : 'No projects yet.'}
      disabled={disabled}
      size={size}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Project"
          placeholder="Search projects by title"
          error={Boolean(error) || search.isError}
          helperText={
            error ??
            (search.isError
              ? 'Projects could not be searched. Close the list and try again.'
              : (helperText ?? undefined))
          }
        />
      )}
    />
  );
};
