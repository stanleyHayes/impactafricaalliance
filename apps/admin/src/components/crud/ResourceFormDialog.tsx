import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { fieldCellProps, firstNamedField, focusField } from '../../resources/field-focus';
import {
  useFieldProblems,
  useHasFieldProblems,
  type FieldProblemsStore,
} from '../../resources/field-problems';
import { useSaveResource } from '../../resources/hooks';
import { withRemovals } from '../../resources/removals';
import { resourceResolver } from '../../resources/resolver';
import type { ResourceConfig, ResourceRow } from '../../resources/types';
import { skinned, surfaceSx } from '../../theme/surfaces';
import { DialogFooter, DialogHeader, dialogBodySx, dialogPaperSx } from '../dialogs/DialogShell';

import { FieldRenderer } from './FieldRenderer';

/**
 * Edit and Preview. Classic: a tab strip ruled off from the form. A skin's
 * tabs are a segmented track (see the theme's MuiTabs), which sits inset in
 * the dialog's gutter rather than padded out to its edges.
 */
const EDIT_PREVIEW_TABS_SX = skinned(
  {
    minHeight: 46,
    px: 3,
    borderBottom: 1,
    borderColor: 'divider',
    '& .MuiTab-root': { minHeight: 46 },
  },
  { minHeight: 0, px: '3px', mx: 3, mt: 1, '& .MuiTab-root': { minHeight: 40 } },
);

interface ResourceFormDialogProps {
  resource: ResourceConfig;
  open: boolean;
  initial: ResourceRow | null;
  onClose: () => void;
}

/**
 * Save met a half-typed date: said until every date is whole or cleared.
 * Only this re-renders as the dates report, never the fields themselves.
 */
const HeldBackNotice = ({ problems }: { problems: FieldProblemsStore }): JSX.Element | null =>
  useHasFieldProblems(problems) ? (
    <Alert severity="error" sx={{ mt: 2 }}>
      Please complete the highlighted fields before saving.
    </Alert>
  ) : null;

/** Create/edit dialog generated from a resource's field configuration, with an optional live preview. */
export const ResourceFormDialog = ({
  resource,
  open,
  initial,
  onClose,
}: ResourceFormDialogProps): JSX.Element => {
  const save = useSaveResource(resource.key);
  const { control, handleSubmit, reset, watch } = useForm<Record<string, unknown>>({
    resolver: resourceResolver(resource.createSchema),
    defaultValues: resource.defaultValues,
  });
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const dateProblems = useFieldProblems();
  // Save met a half-typed date.
  const [heldBack, setHeldBack] = useState(false);
  // The field that held Save back, to put the cursor in once the form shows.
  const [reveal, setReveal] = useState<{ name: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const canPreview = Boolean(resource.renderPreview);

  useEffect(() => {
    if (reveal) focusField(formRef.current, reveal.name);
  }, [reveal]);

  // `save` is a fresh object every render (React Query); depend on the stable
  // `reset` fns only, or the effect re-fires on each preview re-render and snaps
  // the tab back to "edit".
  const resetSave = save.reset;
  useEffect(() => {
    if (open) {
      reset(initial ?? resource.defaultValues);
      resetSave();
      setTab('edit');
      setHeldBack(false);
    }
  }, [open, initial, resource, reset, resetSave]);

  // The fields that need attention are on the Edit tab, even when Save was
  // pressed while previewing; the cursor goes to the first of them.
  const showProblems = (names: readonly string[]): void => {
    setTab('edit');
    const field = firstNamedField(resource.fields, names);
    if (field) setReveal({ name: field.name });
  };
  const onSubmit = handleSubmit(
    (values) => {
      // A half-typed date keeps the field's old value, which would pass, so
      // nothing is saved until it is whole or cleared. The field says what
      // is missing.
      const problems = Object.keys(dateProblems.current());
      if (problems.length) {
        setHeldBack(true);
        showProblems(problems);
        return;
      }
      const body = initial ? withRemovals(resource.fields, initial, values) : values;
      save.mutate({ id: initial?.id, body }, { onSuccess: () => onClose() });
    },
    (invalid) => showProblems([...Object.keys(dateProblems.current()), ...Object.keys(invalid)]),
  );

  const values = watch();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { ...dialogPaperSx, maxHeight: '92vh', overflow: 'hidden' } } }}
    >
      <DialogHeader
        icon={resource.icon}
        eyebrow={`${resource.singular} workspace`}
        title={initial ? `Edit ${resource.singular}` : `Create ${resource.singular}`}
        description={
          initial
            ? 'Update the record and review any changes before saving.'
            : `Add a new ${resource.singular.toLowerCase()} to the workspace.`
        }
        onClose={onClose}
      />

      {canPreview && (
        <Tabs
          value={tab}
          onChange={(_event, next) => setTab(next as 'edit' | 'preview')}
          sx={EDIT_PREVIEW_TABS_SX}
        >
          <Tab value="edit" label="Edit" icon={<EditNoteRoundedIcon />} iconPosition="start" />
          <Tab
            value="preview"
            label="Preview"
            icon={<VisibilityRoundedIcon />}
            iconPosition="start"
          />
        </Tabs>
      )}

      <DialogContent sx={[dialogBodySx, { py: 3 }]}>
        {/* Form stays mounted (hidden while previewing) so RHF state + submit persist. */}
        <Box sx={{ display: tab === 'edit' ? 'block' : 'none' }}>
          <Box
            ref={formRef}
            component="form"
            id="resource-form"
            onSubmit={onSubmit}
            // The resource schema reports every problem under its field; the
            // browser's own validation bubbles would only cover some of them.
            noValidate
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.25,
              p: { xs: 2, sm: 3 },
              borderRadius: 2.5,
              ...surfaceSx.card,
            }}
          >
            {resource.fields.map((field) => (
              <Box
                key={field.name}
                {...fieldCellProps(field.name)}
                sx={{ gridColumn: field.wide ? '1 / -1' : 'auto' }}
              >
                <FieldRenderer
                  field={field}
                  control={control}
                  onProblemChange={dateProblems.report}
                />
              </Box>
            ))}
          </Box>
          {heldBack && <HeldBackNotice problems={dateProblems} />}
          {save.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {/* The server's own words when it has any: telling someone to
                  check their fields is wrong, and misleading, when what
                  actually happened is that the server could not be reached. */}
              {save.error.message || 'Could not save. Please review the fields and try again.'}
            </Alert>
          )}
        </Box>

        {canPreview && (
          <Box
            sx={{
              display: tab === 'preview' ? 'block' : 'none',
              p: { xs: 2, sm: 3 },
              borderRadius: 2.5,
              ...surfaceSx.card,
            }}
          >
            {resource.renderPreview?.(values)}
          </Box>
        )}
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="resource-form"
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
