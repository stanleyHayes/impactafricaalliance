import type { AdminResource } from '@iaa/shared';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useCan } from '../../auth/useCan';
import { api } from '../../lib/api-client';
import { formatUtcDate, formatUtcDateTime } from '../../lib/date';
import { InformationItem } from '../InformationItem';

import { ActionIcon } from './ActionIcon';

export const fieldLabel = (key: string): string =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

const isRecordDate = (field: string, value: unknown): value is string =>
  typeof value === 'string' &&
  /(?:At|Date|date|_at|_date)$/.test(field) &&
  /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
  !Number.isNaN(Date.parse(value));

const RecordValue = ({ value, field }: { value: unknown; field: string }): JSX.Element => {
  if (value === null || value === undefined || value === '') return <>Not provided</>;
  if (isRecordDate(field, value)) {
    return (
      <time dateTime={value} title={value}>
        {value.includes('T')
          ? formatUtcDateTime(value)
          : formatUtcDate(value, { day: 'numeric', month: 'long', year: 'numeric' })}
      </time>
    );
  }
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>;
  if (Array.isArray(value))
    return (
      <RecordFields
        record={Object.fromEntries(value.map((entry, index) => [`Item ${index + 1}`, entry]))}
      />
    );
  if (typeof value === 'object') return <RecordFields record={value as Record<string, unknown>} />;
  if (typeof value === 'string' && /^https?:\/\//i.test(value))
    return (
      <Link href={value} target="_blank" rel="noopener noreferrer">
        {value}
      </Link>
    );
  return <>{String(value)}</>;
};

/** Keep nested answers, false, zero, empty values and long messages visible. */
export const RecordFields = ({ record }: { record: Record<string, unknown> }): JSX.Element => (
  <Stack spacing={2} sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
    {Object.entries(record)
      .filter(([key]) => key !== '__seed' && key !== '__v')
      .map(([key, value]) => (
        <InformationItem key={key} label={fieldLabel(key)}>
          <RecordValue value={value} field={key} />
        </InformationItem>
      ))}
  </Stack>
);

interface Props {
  record: Record<string, unknown>;
  resource: AdminResource;
  endpoint?: string;
  queryKey?: string;
  onView?: () => void;
  onEdit?: () => void;
  editableFields?: string[];
  selectOptions?: Record<string, string[]>;
  deletable?: boolean;
}

const ActionButtons = ({
  resource,
  onView,
  onEdit,
  onDelete,
  disabled,
}: {
  resource: AdminResource;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled: boolean;
}): JSX.Element => {
  const can = useCan();
  return (
    <Stack
      direction="row"
      spacing={0.5}
      aria-label="Actions"
      sx={{ justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}
    >
      {can('read', resource) && (
        <ActionIcon label="View" disabled={disabled} onClick={onView}>
          <VisibilityOutlinedIcon fontSize="small" />
        </ActionIcon>
      )}
      {can('update', resource) && onEdit && (
        <ActionIcon label="Edit" disabled={disabled} onClick={onEdit}>
          <EditOutlinedIcon fontSize="small" />
        </ActionIcon>
      )}
      {can('delete', resource) && onDelete && (
        <ActionIcon label="Delete" disabled={disabled} onClick={onDelete} color="error">
          <DeleteOutlineIcon fontSize="small" />
        </ActionIcon>
      )}
    </Stack>
  );
};

const RecordEditorFields = ({
  record,
  fields,
  values,
  disabled,
  onChange,
  selectOptions,
}: {
  record: Record<string, unknown>;
  fields: string[];
  values: Record<string, string>;
  disabled: boolean;
  onChange: (key: string, value: string) => void;
  selectOptions: Record<string, string[]>;
}): JSX.Element => (
  <Stack spacing={2}>
    {fields.map((key) => {
      const options = typeof record[key] === 'boolean' ? ['true', 'false'] : selectOptions[key];
      const value = values[key] ?? '';
      return (
        <TextField
          key={key}
          select={Boolean(options)}
          label={fieldLabel(key)}
          value={value}
          disabled={disabled}
          multiline={key === 'notes' || key === 'rejectionReason'}
          onChange={(event) => onChange(key, event.target.value)}
        >
          {options && !options.includes(value) && (
            <MenuItem value={value} disabled>
              Choose a status
            </MenuItem>
          )}
          {options?.map((option) => (
            <MenuItem key={option} value={option}>
              {fieldLabel(option)}
            </MenuItem>
          ))}
        </TextField>
      );
    })}
  </Stack>
);

const RecordDialogFooter = ({
  mode,
  busy,
  onClose,
  onSave,
}: {
  mode: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}): JSX.Element => (
  <DialogActions>
    <Button disabled={busy} onClick={onClose}>
      Close
    </Button>
    {(mode === 'edit' || mode === 'delete') && (
      <Button
        variant="contained"
        color={mode === 'delete' ? 'error' : 'primary'}
        disabled={busy}
        onClick={onSave}
      >
        {busy ? 'Saving…' : fieldLabel(mode === 'delete' ? 'delete' : 'save')}
      </Button>
    )}
  </DialogActions>
);

const handlers = (
  {
    onView,
    onEdit,
    editableFields,
    deletable,
  }: {
    onView: Props['onView'];
    onEdit: Props['onEdit'];
    editableFields: string[];
    deletable: boolean;
  },
  open: (mode: 'view' | 'edit' | 'delete') => void,
) => ({
  onView: onView ?? (() => open('view')),
  onEdit: onEdit ?? (editableFields.length ? () => open('edit') : undefined),
  onDelete: deletable ? () => open('delete') : undefined,
});

const invalidationKeys = (resource: AdminResource, queryKey: string): string[] =>
  resource === 'reviews' ? [queryKey, 'events'] : [queryKey];

const TITLES = { view: 'Record details', edit: 'Edit details', delete: 'Delete this record?' };

export const RecordActions = ({
  record,
  resource,
  endpoint,
  queryKey = resource,
  onView,
  onEdit,
  editableFields = [],
  selectOptions = {},
  deletable = false,
}: Props): JSX.Element => {
  const client = useQueryClient();
  const [mode, setMode] = useState<'view' | 'edit' | 'delete' | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () =>
      mode === 'delete'
        ? api.delete(`${endpoint}/${record.id}`)
        : api.patch(
            `${endpoint}/${record.id}`,
            Object.fromEntries(
              Object.entries(values).map(([key, value]) => [
                key,
                typeof record[key] === 'boolean' ? value === 'true' : value,
              ]),
            ),
          ),
    onSuccess: async () => {
      await Promise.all(
        invalidationKeys(resource, queryKey).map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setMode(null);
    },
  });
  const open = (next: typeof mode): void => {
    mutation.reset();
    setValues(Object.fromEntries(editableFields.map((key) => [key, String(record[key] ?? '')])));
    setMode(next);
  };
  return (
    <>
      <ActionButtons
        resource={resource}
        disabled={mutation.isPending}
        {...handlers({ onView, onEdit, editableFields, deletable }, open)}
      />
      <Dialog
        open={mode !== null}
        onClose={mutation.isPending ? undefined : () => setMode(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{TITLES[mode ?? 'view']}</DialogTitle>
        <DialogContent dividers>
          {mutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {mutation.error.message}
            </Alert>
          )}
          {mode === 'view' && <RecordFields record={record} />}
          {mode === 'delete' && (
            <Typography>This permanently deletes this record. This cannot be undone.</Typography>
          )}
          {mode === 'edit' && (
            <RecordEditorFields
              record={record}
              fields={editableFields}
              selectOptions={selectOptions}
              values={values}
              disabled={mutation.isPending}
              onChange={(key, value) => setValues({ ...values, [key]: value })}
            />
          )}
        </DialogContent>
        <RecordDialogFooter
          mode={mode}
          busy={mutation.isPending}
          onClose={() => setMode(null)}
          onSave={() => mutation.mutate()}
        />
      </Dialog>
    </>
  );
};
