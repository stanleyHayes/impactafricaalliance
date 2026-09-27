import type { ProjectRef } from '@iaa/shared';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { useProjectOptions, useTaskProject } from '../../lib/tasks';
import { useDebouncedValue } from '../../lib/use-debounced-value';

/** The filter value for work outside any project, as the API reads it. */
export const NO_PROJECT = 'none';

interface ProjectOption {
  id: string;
  title: string;
  /** Shown under the title in the menu. */
  detail?: string;
}

const NONE_OPTION: ProjectOption = {
  id: NO_PROJECT,
  title: 'No project',
  detail: 'Work outside any project',
};

export interface ProjectPickerProps {
  label: string;
  /** A project id, `none` (with `allowNone`), or null for no choice. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** The chosen project's name when the caller already has it, to save a lookup. */
  known?: ProjectRef | null;
  /** Offers "No project", for filters that look for work outside any project. */
  allowNone?: boolean;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  placeholder?: string;
}

const SEARCH_DELAY_MS = 250;

/**
 * Chooses a project: the one a task belongs to, or a project to filter by.
 *
 * Searches the projects API as the reader types and shows the first twenty
 * matches. Archived projects are not offered, because new work cannot be
 * added to them; a task already on one keeps showing its name.
 */
export const ProjectPicker = ({
  label,
  value,
  onChange,
  known,
  allowNone = false,
  helperText,
  error,
  disabled = false,
  size,
  placeholder = 'Search projects',
}: ProjectPickerProps): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  // The box shows the chosen project's name until the reader types; only
  // typed text is a search.
  const [typing, setTyping] = useState(false);
  const term = useDebouncedValue(typing ? input : '', SEARCH_DELAY_MS);
  const search = useProjectOptions(term, open && !disabled);
  const needsName = Boolean(value) && value !== NO_PROJECT && known?.id !== value;
  const lookup = useTaskProject(needsName ? value : null);

  const selected = useMemo<ProjectOption | null>(() => {
    if (!value) return null;
    if (value === NO_PROJECT) return NONE_OPTION;
    if (known?.id === value) return { id: value, title: known.title };
    if (lookup.data) return { id: value, title: lookup.data.title };
    return { id: value, title: lookup.isError ? 'Project unavailable' : 'Loading…' };
  }, [value, known, lookup.data, lookup.isError]);

  const options = useMemo<ProjectOption[]>(() => {
    const found = (search.data?.items ?? []).map((project) => ({
      id: project.id,
      title: project.title,
      detail: project.code ?? undefined,
    }));
    return allowNone && !term.trim() ? [NONE_OPTION, ...found] : found;
  }, [search.data, allowNone, term]);

  return (
    <Autocomplete<ProjectOption, false, false, false>
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={selected}
      onChange={(_event, next) => onChange(next?.id ?? null)}
      inputValue={input}
      onInputChange={(_event, next, reason) => {
        setInput(next);
        setTyping(reason === 'input');
      }}
      options={options}
      filterOptions={(candidates) => candidates}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      getOptionLabel={(option) => option.title}
      loading={search.isFetching}
      disabled={disabled}
      size={size}
      loadingText="Searching…"
      noOptionsText={
        search.isError
          ? 'Projects could not be loaded. Close this list and try again.'
          : 'No project matches that name.'
      }
      renderOption={({ key, ...optionProps }, option) => (
        <Box component="li" key={key} {...optionProps} sx={{ gap: 1.25 }}>
          <FolderOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
              {option.title}
            </Typography>
            {option.detail && (
              <Typography variant="caption" color="text.secondary" component="p" noWrap>
                {option.detail}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      // "Searching…" in the list says a search is under way; the console
      // shows loading with words and skeletons, never a spinner.
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selected ? undefined : placeholder}
          error={Boolean(error)}
          helperText={error ?? helperText}
        />
      )}
    />
  );
};
