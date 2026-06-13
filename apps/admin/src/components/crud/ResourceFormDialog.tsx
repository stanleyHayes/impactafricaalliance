import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';

import { useSaveResource } from '../../resources/hooks';
import type { ResourceConfig, ResourceRow } from '../../resources/types';

import { FieldRenderer } from './FieldRenderer';

interface ResourceFormDialogProps {
  resource: ResourceConfig;
  open: boolean;
  initial: ResourceRow | null;
  onClose: () => void;
}

/** Create/edit dialog generated from a resource's field configuration. */
export const ResourceFormDialog = ({
  resource,
  open,
  initial,
  onClose,
}: ResourceFormDialogProps): JSX.Element => {
  const save = useSaveResource(resource.key);
  const { control, handleSubmit, reset } = useForm<Record<string, unknown>>({
    // The generic resource schema's input type is `unknown`; bypass the resolver's
    // FieldValues constraint and re-assert the form's value type explicitly.
    resolver: zodResolver(resource.createSchema as never) as Resolver<Record<string, unknown>>,
    defaultValues: resource.defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(initial ?? resource.defaultValues);
      save.reset();
    }
  }, [open, initial, resource, reset, save]);

  const onSubmit = handleSubmit((values) => {
    save.mutate({ id: initial?.id, body: values }, { onSuccess: () => onClose() });
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {initial ? `Edit ${resource.singular}` : `New ${resource.singular}`}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          id="resource-form"
          onSubmit={onSubmit}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, pt: 1 }}
        >
          {resource.fields.map((field) => (
            <Box key={field.name} sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}>
              <FieldRenderer field={field} control={control} />
            </Box>
          ))}
        </Box>
        {save.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Could not save. Please review the fields and try again.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="resource-form" variant="contained" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
