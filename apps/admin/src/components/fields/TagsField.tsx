import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

interface TagsFieldProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  helperText?: string;
}

const splitTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

/**
 * Tag input that commits on comma, Enter or blur.
 *
 * The previous field re-derived its own text from the parsed array on every
 * keystroke, so it trimmed the space you had just typed and swallowed the
 * comma — a multi-word tag was impossible to enter. Here the text being typed
 * is separate state, and only committed tags become the value.
 */
export const TagsField = ({
  label,
  value,
  onChange,
  error,
  helperText,
}: TagsFieldProps): JSX.Element => {
  const [draft, setDraft] = useState('');
  const tags = Array.isArray(value) ? value : [];

  const commit = (raw: string): void => {
    const additions = splitTags(raw).filter((tag) => !tags.includes(tag));
    if (additions.length > 0) {
      onChange([...tags, ...additions]);
    }
    setDraft('');
  };

  return (
    <Autocomplete<string, true, false, true>
      multiple
      freeSolo
      options={[] as string[]}
      value={tags}
      inputValue={draft}
      onInputChange={(_event, next, reason) => {
        if (reason === 'reset') {
          return;
        }
        // A typed comma ends the tag; everything before it is committed.
        if (next.includes(',')) {
          commit(next);
          return;
        }
        setDraft(next);
      }}
      onChange={(_event, next: readonly string[]) => {
        onChange(next.flatMap((entry) => splitTags(String(entry))));
        setDraft('');
      }}
      onBlur={() => commit(draft)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={Boolean(error)}
          helperText={error ?? helperText ?? 'Type a tag, then press Enter or comma.'}
        />
      )}
    />
  );
};
