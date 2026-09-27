import type { PersonSummary } from '@iaa/shared';
import Autocomplete, { type AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  useCallback,
  useMemo,
  useState,
  type HTMLAttributes,
  type Key,
  type ReactNode,
} from 'react';

import { initials } from '../../lib/initials';
import { usePeople, usePeopleSearch } from '../../lib/people';
import { useDebouncedValue } from '../../lib/use-debounced-value';

/**
 * A person as the picker holds them. `missing` marks an id the directory did
 * not return: someone who has left, or whose account was switched off. They
 * stay selected, so saving does not quietly drop them, and can be removed.
 */
type PersonOption = Pick<PersonSummary, 'id' | 'name' | 'email'> & { missing?: boolean };

interface UserPickerBaseProps {
  label: string;
  helperText?: string;
  /** The field's error message; the field turns red when set. */
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface SingleUserPickerProps extends UserPickerBaseProps {
  multiple?: false;
  /** The chosen person's id, or null. */
  value: string | null;
  onChange: (value: string | null) => void;
  max?: never;
}

interface MultipleUserPickerProps extends UserPickerBaseProps {
  multiple: true;
  /** The chosen people's ids, in the order they were added. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Most people that can be chosen, such as 10 assignees on a task. */
  max?: number;
}

export type UserPickerProps = SingleUserPickerProps | MultipleUserPickerProps;

/** Wait after the last keystroke before asking the directory, in milliseconds. */
const SEARCH_DELAY_MS = 250;

const idsOf = (props: UserPickerProps): string[] => {
  if (props.multiple) return props.value;
  return props.value ? [props.value] : [];
};

const PersonAvatar = ({ name, size = 24 }: { name: string; size?: number }): JSX.Element => (
  <Avatar
    aria-hidden
    sx={{
      width: size,
      height: size,
      fontSize: size > 24 ? '0.8rem' : '0.66rem',
      fontWeight: 750,
      color: 'text.primary',
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
    }}
  >
    {initials(name)}
  </Avatar>
);

const renderPersonOption = (
  { key, ...optionProps }: HTMLAttributes<HTMLLIElement> & { key: Key },
  option: PersonOption,
): ReactNode => (
  <Box component="li" key={key} {...optionProps} sx={{ gap: 1.25 }}>
    <PersonAvatar name={option.name} size={32} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
        {option.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" noWrap>
        {option.email}
      </Typography>
    </Box>
  </Box>
);

// Stable across renders: the Autocomplete re-runs its input reset whenever
// these change identity.
const getOptionLabel = (option: PersonOption): string => option.name || option.email;
const isSamePerson = (option: PersonOption, current: PersonOption): boolean =>
  option.id === current.id;
// The directory has already filtered by the search term.
const keepServerOrder = (candidates: PersonOption[]): PersonOption[] => candidates;

/** What a chip says for an id the directory has not named. */
const placeholderName = (looking: boolean, failed: boolean): string => {
  if (looking) return 'Loading…';
  if (failed) return 'Name unavailable';
  return 'Former colleague';
};

const PersonChip = ({
  option,
  itemProps,
}: {
  option: PersonOption;
  itemProps: Record<string, unknown>;
}): JSX.Element => (
  <Chip
    {...itemProps}
    size="small"
    avatar={<PersonAvatar name={option.name} />}
    label={option.name}
    title={option.missing ? 'No longer in the people directory' : option.email}
    sx={option.missing ? { fontStyle: 'italic' } : undefined}
  />
);

/**
 * Chooses colleagues: a task's assignees, a project's lead and members, a
 * reviewer.
 *
 * Searches the people directory as the reader types, which lists active
 * colleagues only and only their name, email and role, so editors can use it
 * without seeing the user list. People already on the record are looked up by
 * id, so their chips show names from the first render rather than ids.
 */
export const UserPicker = (props: UserPickerProps): JSX.Element => {
  const { label, helperText, error, disabled = false, required = false, placeholder } = props;
  const selectedIds = idsOf(props);
  const max = props.multiple ? props.max : undefined;
  const atMax = max !== undefined && selectedIds.length >= max;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const handleInputChange = useCallback((_event: unknown, next: string) => setInputValue(next), []);
  // People chosen from search results in this session, so their chips have a
  // name at once instead of waiting for a lookup.
  const [picked, setPicked] = useState<Record<string, PersonOption>>({});

  // isLoading rather than isPending: a lookup with nothing to resolve is
  // disabled, and a disabled query stays pending for ever.
  const {
    data: found,
    isLoading: looking,
    isError: lookupFailed,
  } = usePeople(selectedIds.filter((id) => !picked[id]));

  // Rebuilt only when the choice or what is known about it changes. The
  // Autocomplete treats a new array as a new value and empties the search
  // box, so a fresh array on every render would wipe each keystroke.
  const idsKey = selectedIds.join(',');
  const selected = useMemo<PersonOption[]>(() => {
    const byId = new Map<string, PersonOption>();
    for (const person of found ?? []) byId.set(person.id, person);
    for (const person of Object.values(picked)) byId.set(person.id, person);
    const ids = idsKey ? idsKey.split(',') : [];
    return ids.map(
      (id) =>
        byId.get(id) ?? {
          id,
          name: placeholderName(looking, lookupFailed),
          email: '',
          // Only an answer that leaves someone out says they have gone.
          missing: !looking && !lookupFailed,
        },
    );
  }, [idsKey, found, looking, lookupFailed, picked]);

  // Both modes draw the chosen people as chips, so the input only ever holds
  // what is being typed, and an empty input lists everyone.
  const search = usePeopleSearch(useDebouncedValue(inputValue, SEARCH_DELAY_MS), open && !disabled);
  const options: PersonOption[] = search.data?.items ?? [];

  const remember = (people: readonly PersonOption[]): void => {
    const fresh = people.filter((person) => !person.missing && !picked[person.id]);
    if (fresh.length > 0) {
      setPicked((current) => ({
        ...current,
        ...Object.fromEntries(fresh.map((person) => [person.id, person])),
      }));
    }
  };

  const atMaxNote = atMax ? `That is the most people this can hold (${max}).` : undefined;
  const shared = {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    options,
    loading: search.isFetching,
    disabled,
    inputValue,
    onInputChange: handleInputChange,
    filterOptions: keepServerOrder,
    isOptionEqualToValue: isSamePerson,
    getOptionLabel,
    getOptionDisabled: (option: PersonOption) => atMax && !selectedIds.includes(option.id),
    renderOption: renderPersonOption,
    loadingText: 'Searching…',
    noOptionsText: search.isError
      ? 'The people directory could not be reached. Close this list and try again.'
      : 'Nobody matches that name or email.',
    renderInput: (params: AutocompleteRenderInputParams) => (
      <TextField
        {...params}
        label={label}
        required={required}
        placeholder={selected.length === 0 ? (placeholder ?? 'Search by name or email') : undefined}
        error={Boolean(error)}
        helperText={error ?? atMaxNote ?? helperText}
        slotProps={{
          ...params.slotProps,
          input: {
            ...params.slotProps.input,
            endAdornment: (
              <>
                {search.isFetching && open ? <CircularProgress color="inherit" size={18} /> : null}
                {params.slotProps.input.endAdornment}
              </>
            ),
          },
          // `required` marks the label only. The text box is empty whenever
          // people are chosen (they show as chips), so the browser's own
          // required check would refuse a valid form.
          htmlInput: { ...params.slotProps.htmlInput, required: false },
        }}
      />
    ),
  };

  if (props.multiple) {
    const { onChange } = props;
    return (
      <Autocomplete<PersonOption, true, false, false>
        {...shared}
        multiple
        filterSelectedOptions
        value={selected}
        onChange={(_event, next) => {
          remember(next);
          onChange(next.map((person) => person.id));
        }}
        renderValue={(people, getItemProps) =>
          people.map((person, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return <PersonChip key={key} option={person} itemProps={itemProps} />;
          })
        }
      />
    );
  }

  const { onChange } = props;
  return (
    <Autocomplete<PersonOption, false, false, false>
      {...shared}
      value={selected[0] ?? null}
      onChange={(_event, next) => {
        if (next) remember([next]);
        onChange(next?.id ?? null);
      }}
      renderValue={(person, getItemProps) => (
        <PersonChip option={person} itemProps={getItemProps()} />
      )}
    />
  );
};
