import { mentionToken, type PersonSummary } from '@iaa/shared';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';

import { initials } from '../../lib/initials';
import { usePeopleSearch } from '../../lib/people';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { skinned, surfaceSx, tokenVar } from '../../theme/surfaces';

/** An `@` being typed: where it starts and what follows it so far. */
interface MentionQuery {
  start: number;
  term: string;
}

// An @ at the start or after a space, then up to 40 characters that could be
// part of a name. Brackets end it, so a finished token never re-opens the list.
const MENTION_AT_CARET = /(^|\s)@([^\s@[\]()]{0,40})$/;

/** The mention being typed at the caret, if there is one. */
export const mentionAtCaret = (text: string, caret: number): MentionQuery | null => {
  const match = MENTION_AT_CARET.exec(text.slice(0, caret));
  if (!match) return null;
  const term = match[2] ?? '';
  return { start: caret - term.length - 1, term };
};

/** People shown in the list at once; more typing narrows it. */
const SUGGESTIONS = 6;

/**
 * The list's panel. Classic: a paper with a divider edge and MUI's shadow for
 * its elevation. The other skins draw it as they draw every menu and listbox,
 * with the same inner padding their listboxes have.
 */
const listPanelSx = skinned(
  { mt: 0.5, py: 0.5, borderRadius: 2.5, border: 1, borderColor: 'divider' },
  { ...surfaceSx.overlay, px: '6px', py: '6px' },
);

/**
 * A colleague in the list. Classic tints the one the keyboard is on. The
 * other skins paint it as their listboxes paint an `aria-selected` option,
 * which this one is: the skins' hover look is too faint here (in Glass it is
 * frosted white on a frosted white panel), and this highlight is the only
 * sign of who Enter will mention.
 */
const optionSx = (highlighted: boolean) =>
  skinned(
    {
      bgcolor: (theme) => (highlighted ? alpha(theme.palette.primary.main, 0.1) : 'transparent'),
    },
    {
      borderRadius: tokenVar('itemRadius'),
      bgcolor: highlighted ? tokenVar('itemSelectedBg') : 'transparent',
      boxShadow: highlighted ? tokenVar('itemSelectedShadow') : 'none',
      // The name takes the skin's selected colour; the email stays secondary.
      ...(highlighted && { '& .MuiTypography-body2': { color: tokenVar('itemSelectedColor') } }),
    },
  );

/** The colleagues matching what follows the `@`, as a list the keyboard can move through. */
const MentionList = ({
  id,
  anchor,
  open,
  people,
  highlight,
  onHighlight,
  onChoose,
}: {
  id: string;
  anchor: HTMLElement | null;
  open: boolean;
  people: PersonSummary[];
  highlight: number;
  onHighlight: (index: number) => void;
  onChoose: (person: PersonSummary) => void;
}): JSX.Element => (
  <Popper
    open={open}
    anchorEl={anchor}
    placement="bottom-start"
    sx={{ zIndex: (theme) => theme.zIndex.modal + 1, width: anchor?.clientWidth }}
  >
    <Paper id={id} role="listbox" aria-label="Colleagues to mention" elevation={8} sx={listPanelSx}>
      {people.map((person, index) => (
        <Box
          key={person.id}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === highlight}
          // Chosen on mouse down, before the text box loses focus and closes the list.
          onMouseDown={(event) => {
            event.preventDefault();
            onChoose(person);
          }}
          onMouseEnter={() => onHighlight(index)}
          sx={[
            {
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
            },
            optionSx(index === highlight),
          ]}
        >
          <Avatar
            aria-hidden
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.7rem',
              fontWeight: 750,
              color: 'text.primary',
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
            }}
          >
            {initials(person.name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
              {person.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" noWrap>
              {person.email}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  </Popper>
);

export interface MentionComposerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Ctrl+Enter or ⌘+Enter. */
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  helperText?: string;
  error?: string;
}

/**
 * A comment box that can mention colleagues.
 *
 * Typing `@` and part of a name lists matching colleagues from the people
 * directory; choosing one writes a token, `@[Ama Mensah](<id>)`, which the API
 * reads to know exactly who was meant (a name alone can be shared or change).
 * The list works from the keyboard: arrows to move, Enter or Tab to choose,
 * Escape to close without leaving the drawer.
 */
export const MentionComposer = ({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  autoFocus = false,
  helperText,
  error,
}: MentionComposerProps): JSX.Element => {
  const listId = useId();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [highlight, setHighlight] = useState(0);
  const term = useDebouncedValue(query?.term ?? '', 200);
  const search = usePeopleSearch(term, query !== null && !disabled);
  const people: PersonSummary[] = query ? (search.data?.items ?? []).slice(0, SUGGESTIONS) : [];
  const open = query !== null && people.length > 0;

  const track = (text: string, caret: number | null): void => {
    const next = caret === null ? null : mentionAtCaret(text, caret);
    setQuery(next);
    if (next?.term !== query?.term) setHighlight(0);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    onChange(event.target.value);
    track(event.target.value, event.target.selectionStart);
  };

  const handleSelect = (event: SyntheticEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLTextAreaElement;
    track(target.value, target.selectionStart);
  };

  const choose = (person: PersonSummary): void => {
    if (!query) return;
    const caret = query.start + query.term.length + 1;
    const token = `${mentionToken(person)} `;
    const next = `${value.slice(0, query.start)}${token}${value.slice(caret)}`;
    onChange(next);
    setQuery(null);
    const position = query.start + token.length;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  const insertAt = (): void => {
    const input = inputRef.current;
    const caret = input?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const spacer = before === '' || /\s$/.test(before) ? '' : ' ';
    const next = `${before}${spacer}@${value.slice(caret)}`;
    onChange(next);
    const position = caret + spacer.length + 1;
    setQuery({ start: position - 1, term: '' });
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(position, position);
    });
  };

  const handleListKeys = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
    const step = moves[event.key];
    if (step !== undefined) {
      setHighlight((current) => (current + step + people.length) % people.length);
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const person = people[highlight];
      if (person) choose(person);
      return true;
    }
    if (event.key === 'Escape') {
      // Closes the list only; the drawer around this box stays open.
      event.stopPropagation();
      setQuery(null);
      return true;
    }
    return false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (open && handleListKeys(event)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  const activeId = open ? `${listId}-${highlight}` : undefined;

  return (
    <Box ref={anchorRef} sx={{ position: 'relative' }}>
      <TextField
        label={label}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onBlur={() => setQuery(null)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        multiline
        minRows={3}
        fullWidth
        error={Boolean(error)}
        helperText={error ?? helperText ?? 'Type @ to mention a colleague. Ctrl+Enter to send.'}
        inputRef={inputRef}
        // Room on the right for the @ button, so text never runs under it.
        sx={{ '& .MuiInputBase-root': { pr: 6 } }}
        slotProps={{
          // A text box may say it offers a list and which option is active,
          // but `aria-expanded` belongs to a combobox, which a multi-line
          // comment box is not; `aria-controls` names the list while it shows.
          htmlInput: {
            'aria-autocomplete': 'list',
            'aria-controls': open ? listId : undefined,
            'aria-activedescendant': activeId,
          },
        }}
      />
      <Tooltip title="Mention a colleague">
        <span>
          <IconButton
            size="small"
            aria-label="Mention a colleague"
            onClick={insertAt}
            disabled={disabled}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <AlternateEmailRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <MentionList
        id={listId}
        anchor={anchorRef.current}
        open={open}
        people={people}
        highlight={highlight}
        onHighlight={setHighlight}
        onChoose={choose}
      />
    </Box>
  );
};
