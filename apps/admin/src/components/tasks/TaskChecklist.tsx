import { TASK_CHECKLIST_LIMIT, type ChecklistItem, type Task } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent, type KeyboardEvent } from 'react';

import {
  useAddChecklistItem,
  useRemoveChecklistItem,
  useUpdateChecklistItem,
} from '../../lib/tasks';
import { ActionIcon } from '../data/ActionIcon';

const TEXT_MAX = 300;

const ChecklistLine = ({
  item,
  taskId,
  canEdit,
  onError,
}: {
  item: ChecklistItem;
  taskId: string;
  canEdit: boolean;
  onError: (message: string) => void;
}): JSX.Element => {
  const update = useUpdateChecklistItem();
  const remove = useRemoveChecklistItem();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const busy = update.isPending || remove.isPending;
  const fail = (error: Error): void => onError(error.message);

  const saveText = (): void => {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === item.text) {
      setDraft(item.text);
      return;
    }
    update.mutate({ taskId, itemId: item.id, patch: { text } }, { onError: fail });
  };

  const handleKeys = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveText();
    } else if (event.key === 'Escape') {
      // Stops here so Escape cancels the edit rather than closing the drawer.
      event.stopPropagation();
      setDraft(item.text);
      setEditing(false);
    }
  };

  const doneBy = item.done && item.doneBy ? `Ticked by ${item.doneBy.name}` : undefined;

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Checkbox
        checked={item.done}
        disabled={!canEdit || busy}
        onChange={(_event, done) =>
          update.mutate({ taskId, itemId: item.id, patch: { done } }, { onError: fail })
        }
        slotProps={{ input: { 'aria-label': `${item.done ? 'Untick' : 'Tick'} ${item.text}` } }}
      />
      {editing ? (
        <TextField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeys}
          onBlur={saveText}
          size="small"
          autoFocus
          fullWidth
          label="Checklist item"
          slotProps={{ htmlInput: { maxLength: TEXT_MAX } }}
        />
      ) : (
        <ButtonBase
          onClick={() => canEdit && setEditing(true)}
          disabled={!canEdit || busy}
          title={doneBy}
          aria-label={canEdit ? `Reword ${item.text}` : item.text}
          sx={{
            justifyContent: 'flex-start',
            textAlign: 'left',
            borderRadius: 1.5,
            px: 0.75,
            py: 0.5,
            minWidth: 0,
            '&.Mui-disabled': { color: 'inherit' },
            '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              textDecoration: item.done ? 'line-through' : 'none',
              color: item.done ? 'text.secondary' : 'text.primary',
              overflowWrap: 'anywhere',
            }}
          >
            {item.text}
          </Typography>
        </ButtonBase>
      )}
      {canEdit ? (
        <ActionIcon
          label={`Remove ${item.text}`}
          color="error"
          disabled={busy}
          onClick={() => remove.mutate({ taskId, itemId: item.id }, { onError: fail })}
        >
          <DeleteOutlineRoundedIcon fontSize="small" />
        </ActionIcon>
      ) : (
        <span />
      )}
    </Box>
  );
};

/**
 * A task's checklist: the small steps that make up the work.
 *
 * Each tick, rewording and removal saves at once and on its own, so two
 * people working through the same list never undo each other. Removing a
 * line does not ask first: it is one line, and typing it again takes a
 * moment.
 */
export const TaskChecklist = ({ task, canEdit }: { task: Task; canEdit: boolean }): JSX.Element => {
  const add = useAddChecklistItem();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const items = task.checklist;
  const done = items.filter((item) => item.done).length;
  const full = items.length >= TASK_CHECKLIST_LIMIT;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const value = text.trim();
    if (!value || add.isPending || full) return;
    setError(null);
    add.mutate(
      { taskId: task.id, text: value },
      { onSuccess: () => setText(''), onError: (cause) => setError(cause.message) },
    );
  };

  return (
    <Stack spacing={1.5}>
      {items.length > 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
              {done} of {items.length} done
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={(done / items.length) * 100}
            aria-label={`${done} of ${items.length} checklist items done`}
            color={done === items.length ? 'success' : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}
      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No checklist yet. Break the work into steps you can tick off.
        </Typography>
      )}
      {items.length > 0 && (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {items.map((item) => (
            <ChecklistLine
              key={item.id}
              item={item}
              taskId={task.id}
              canEdit={canEdit}
              onError={setError}
            />
          ))}
        </Box>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {canEdit && (
        <Stack component="form" direction="row" spacing={1} onSubmit={submit} noValidate>
          <TextField
            value={text}
            onChange={(event) => setText(event.target.value)}
            size="small"
            fullWidth
            label="Add an item"
            disabled={add.isPending || full}
            helperText={
              full
                ? `A checklist holds ${TASK_CHECKLIST_LIMIT} items. Remove one to add another.`
                : undefined
            }
            slotProps={{ htmlInput: { maxLength: TEXT_MAX } }}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            disabled={add.isPending || full || !text.trim()}
            sx={{ flexShrink: 0, alignSelf: 'flex-start', height: 40 }}
          >
            Add
          </Button>
        </Stack>
      )}
    </Stack>
  );
};
