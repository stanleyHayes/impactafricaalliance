import type { TaskRef } from '@iaa/shared';
import Autocomplete, { type AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type HTMLAttributes, type Key, type ReactNode } from 'react';

import { useTaskOptions } from '../../lib/tasks';
import { useDebouncedValue } from '../../lib/use-debounced-value';

import { taskStatusLabel } from './task-display';

interface TaskPickerBaseProps {
  label: string;
  /** Tasks that may not be chosen, such as the task being edited. */
  excludeIds?: readonly string[];
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

interface SingleTaskPickerProps extends TaskPickerBaseProps {
  multiple?: false;
  value: TaskRef | null;
  onChange: (value: TaskRef | null) => void;
}

interface MultipleTaskPickerProps extends TaskPickerBaseProps {
  multiple: true;
  value: TaskRef[];
  onChange: (value: TaskRef[]) => void;
}

export type TaskPickerProps = SingleTaskPickerProps | MultipleTaskPickerProps;

const SEARCH_DELAY_MS = 250;

const optionLabel = (task: TaskRef): string => `${task.key} · ${task.title}`;
const sameTask = (option: TaskRef, current: TaskRef): boolean => option.id === current.id;

const renderTaskOption = (
  { key, ...optionProps }: HTMLAttributes<HTMLLIElement> & { key: Key },
  task: TaskRef,
): ReactNode => (
  <Box component="li" key={key} {...optionProps} sx={{ gap: 1 }}>
    <Typography variant="caption" sx={{ fontWeight: 750, color: 'text.secondary', flexShrink: 0 }}>
      {task.key}
    </Typography>
    <Typography variant="body2" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
      {task.title}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
      {taskStatusLabel(task.status)}
    </Typography>
  </Box>
);

/**
 * Chooses other tasks: a parent, or the tasks this one waits for.
 *
 * Searches by title or key as the reader types, finished work included, since
 * a dependency is often already done. The caller passes the tasks already
 * chosen as references, so their names show without a lookup.
 */
export const TaskPicker = (props: TaskPickerProps): JSX.Element => {
  const { label, excludeIds = [], helperText, error, disabled = false } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const term = useDebouncedValue(typing ? input : '', SEARCH_DELAY_MS);
  const search = useTaskOptions(term, open && !disabled);
  const excluded = excludeIds.join(',');

  const options = useMemo<TaskRef[]>(() => {
    const skip = new Set(excluded ? excluded.split(',') : []);
    return (search.data?.items ?? [])
      .filter((task) => !skip.has(task.id))
      .map((task) => ({ id: task.id, key: task.key, title: task.title, status: task.status }));
  }, [search.data, excluded]);

  const shared = {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    options,
    inputValue: input,
    onInputChange: (_event: unknown, next: string, reason: string) => {
      setInput(next);
      setTyping(reason === 'input');
    },
    filterOptions: (candidates: TaskRef[]) => candidates,
    isOptionEqualToValue: sameTask,
    getOptionLabel: optionLabel,
    renderOption: renderTaskOption,
    loading: search.isFetching,
    loadingText: 'Searching…',
    noOptionsText: search.isError
      ? 'Tasks could not be loaded. Close this list and try again.'
      : 'No task matches that title or key.',
    disabled,
    renderInput: (params: AutocompleteRenderInputParams) => (
      <TextField
        {...params}
        label={label}
        placeholder="Search by title or key"
        error={Boolean(error)}
        helperText={error ?? helperText}
      />
    ),
  };

  if (props.multiple) {
    const { onChange, value } = props;
    return (
      <Autocomplete<TaskRef, true, false, false>
        {...shared}
        multiple
        filterSelectedOptions
        value={value}
        onChange={(_event, next) => onChange(next)}
        renderValue={(tasks, getItemProps) =>
          tasks.map((task, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return (
              <Chip key={key} {...itemProps} size="small" label={task.key} title={task.title} />
            );
          })
        }
      />
    );
  }
  const { onChange, value } = props;
  return (
    <Autocomplete<TaskRef, false, false, false>
      {...shared}
      value={value}
      onChange={(_event, next) => onChange(next)}
    />
  );
};
