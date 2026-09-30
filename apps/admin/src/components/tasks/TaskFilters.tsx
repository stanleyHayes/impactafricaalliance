import type { DueBucket, TaskStatus, WorkPriority } from '@iaa/shared';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect, useRef, useState } from 'react';

import {
  DUE_BUCKET_OPTIONS,
  TASK_STATUS_OPTIONS,
  WORK_PRIORITY_OPTIONS,
  withAnyOption,
} from '../../lib/select-options';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { surfaceSx } from '../../theme/surfaces';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';
import { UserPicker } from '../people/UserPicker';

import { ProjectPicker } from './ProjectPicker';
import { taskStatusLabel } from './task-display';
import type { TaskFilterControls } from './use-task-filters';

const PRIORITY_FILTER = withAnyOption(
  WORK_PRIORITY_OPTIONS,
  'Any priority',
  'Every task, however pressing.',
);
const DUE_FILTER = withAnyOption(DUE_BUCKET_OPTIONS, 'Any due date', 'Dated and undated work.');

const ASSIGNEE_MODES: SelectChoice[] = [
  { value: '', label: 'Anyone', description: 'Work assigned to anybody, or to nobody.' },
  { value: 'me', label: 'Me', description: 'Work assigned to you.' },
  { value: 'none', label: 'Unassigned', description: 'Work nobody has picked up yet.' },
  { value: 'person', label: 'A colleague…', description: 'Choose someone from the team.' },
];

/**
 * Text typed into a filter, sent to the address a moment after typing stops
 * rather than on every key.
 */
const useDebouncedFilter = (
  value: string,
  commit: (value: string) => void,
): [string, (value: string) => void] => {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const debounced = useDebouncedValue(draft, 300);
  // Cleared or changed from elsewhere (Clear filters, Back): show the new value.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  // Read through a ref so only a settled draft sends anything: the address
  // catching up to it must not send it again.
  const latest = useRef({ value, commit });
  useEffect(() => {
    latest.current = { value, commit };
  });
  useEffect(() => {
    if (debounced !== latest.current.value) latest.current.commit(debounced);
  }, [debounced]);
  return [draft, setDraft];
};

/** Anyone, me, unassigned, or a named colleague. */
const AssigneeFilter = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): JSX.Element => {
  const [choosing, setChoosing] = useState(false);
  const isPerson = value !== '' && value !== 'me' && value !== 'none';
  const mode = isPerson || choosing ? 'person' : value;
  return (
    <Stack spacing={1.5}>
      <OptionSelect
        label="Assignee"
        options={ASSIGNEE_MODES}
        value={mode}
        onChange={(next) => {
          setChoosing(next === 'person');
          if (next !== 'person') onChange(next);
        }}
      />
      {mode === 'person' && (
        <UserPicker
          label="Colleague"
          value={isPerson ? value : null}
          onChange={(id) => onChange(id ?? '')}
        />
      )}
    </Stack>
  );
};

const StatusFilter = ({
  value,
  onChange,
}: {
  value: TaskStatus[];
  onChange: (value: TaskStatus[]) => void;
}): JSX.Element => (
  <TextField
    select
    fullWidth
    label="Status"
    value={value}
    onChange={(event) => {
      const next = event.target.value as unknown as TaskStatus[] | string;
      onChange(typeof next === 'string' ? (next.split(',') as TaskStatus[]) : next);
    }}
    slotProps={{
      select: {
        multiple: true,
        displayEmpty: true,
        // Drawn like OptionSelect's value, so the row of filters reads alike.
        renderValue: (selected) => {
          const statuses = selected as TaskStatus[];
          return (
            <Typography component="span" sx={{ fontWeight: 600 }} noWrap>
              {statuses.length === 0 ? 'Any status' : statuses.map(taskStatusLabel).join(', ')}
            </Typography>
          );
        },
      },
      inputLabel: { shrink: true },
    }}
  >
    {TASK_STATUS_OPTIONS.map((option) => (
      <MenuItem key={option.value} value={option.value} dense>
        <Checkbox
          checked={value.includes(option.value as TaskStatus)}
          size="small"
          sx={{ p: 0.5, mr: 1 }}
        />
        <ListItemText primary={option.label} secondary={option.description} />
      </MenuItem>
    ))}
  </TextField>
);

/**
 * The filters above the task list and the board, all held in the address.
 * On a phone only the search shows until "Filters" opens the rest, so the
 * list itself stays in view.
 */
export const TaskFilters = ({
  controls,
  showDoneToggle = true,
}: {
  controls: TaskFilterControls;
  /** The list hides finished work unless asked; the board has a Done column instead. */
  showDoneToggle?: boolean;
}): JSX.Element => {
  const { filters, setFilter, clear, activeCount } = controls;
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useDebouncedFilter(filters.q, (value) => setFilter('q', value));
  const [label, setLabel] = useDebouncedFilter(filters.label, (value) => setFilter('label', value));
  const otherCount = activeCount - (filters.q ? 1 : 0);

  return (
    <Box
      component="section"
      aria-label="Task filters"
      sx={{ mb: 3, p: { xs: 2, md: 2.5 }, borderRadius: 3, ...surfaceSx.card }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          fullWidth
          label="Search"
          placeholder="Title or key, such as IAA-42"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            htmlInput: { maxLength: 80 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        {!wide && (
          <Badge badgeContent={otherCount} color="primary" invisible={otherCount === 0}>
            <Button
              variant="outlined"
              startIcon={<FilterListRoundedIcon />}
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls="task-filter-fields"
              sx={{ flexShrink: 0, height: 56 }}
            >
              Filters
            </Button>
          </Badge>
        )}
      </Stack>
      <Collapse in={wide || expanded} id="task-filter-fields">
        <Box
          sx={{
            mt: 2,
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          <StatusFilter value={filters.status} onChange={(value) => setFilter('status', value)} />
          <OptionSelect
            label="Priority"
            options={PRIORITY_FILTER}
            value={filters.priority}
            onChange={(value) => setFilter('priority', value as WorkPriority | '')}
          />
          <OptionSelect
            label="Due"
            options={DUE_FILTER}
            value={filters.due}
            onChange={(value) => setFilter('due', value as DueBucket | '')}
          />
          <AssigneeFilter
            value={filters.assignee}
            onChange={(value) => setFilter('assignee', value)}
          />
          <ProjectPicker
            label="Project"
            allowNone
            value={filters.project || null}
            onChange={(value) => setFilter('project', value ?? '')}
            placeholder="Any project"
          />
          <TextField
            label="Label"
            placeholder="Any label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 40 } }}
          />
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mt: 1.5 }}
        >
          {showDoneToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={filters.done}
                  onChange={(_event, checked) => setFilter('done', checked)}
                />
              }
              label="Show completed"
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={filters.archived}
                onChange={(_event, checked) => setFilter('archived', checked)}
              />
            }
            label="Show archived"
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={clear} disabled={activeCount === 0}>
            Clear filters
          </Button>
        </Stack>
      </Collapse>
    </Box>
  );
};
