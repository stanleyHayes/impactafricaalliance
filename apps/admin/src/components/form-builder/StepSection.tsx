import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { FormField, FormFieldType, FormStep } from '@iaa/shared';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRef, useState, type MutableRefObject } from 'react';

import { MediaUploadField } from '../fields/MediaUploadField';

import { AddQuestionButton } from './AddQuestionButton';
import {
  MAX_FIELDS_PER_STEP,
  problemsForField,
  problemsForStep,
  questionsBefore,
} from './builder-model';
import { QuestionCard } from './QuestionCard';
import { VisibilityRuleEditor } from './VisibilityRuleEditor';

/** The step's name and where it sits, with its move and remove buttons. */
const StepHeader = ({
  headingId,
  title,
  stepIndex,
  count,
  onMoveStep,
  onRemoveStep,
  disabled,
}: {
  headingId: string;
  title: string;
  stepIndex: number;
  count: number;
  onMoveStep: (offset: -1 | 1) => void;
  onRemoveStep: () => void;
  disabled: boolean;
}): JSX.Element => (
  // An object `sx`, with the theme read only for the tint: the console's
  // Stack merges its layout props into `sx`, and a whole-`sx` function would
  // lose every style here (padding, tint and divider alike).
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{
      px: { xs: 2, md: 2.5 },
      py: 1.5,
      borderBottom: 1,
      borderColor: 'divider',
      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    }}
  >
    <Typography
      id={headingId}
      component="h3"
      variant="subtitle1"
      sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}
      noWrap
    >
      Step {stepIndex + 1} of {count}: {title.trim() || 'Untitled step'}
    </Typography>
    <IconButton
      aria-label={`Move step ${stepIndex + 1} up`}
      size="small"
      onClick={() => onMoveStep(-1)}
      disabled={disabled || stepIndex === 0}
    >
      <ArrowUpwardRoundedIcon fontSize="small" />
    </IconButton>
    <IconButton
      aria-label={`Move step ${stepIndex + 1} down`}
      size="small"
      onClick={() => onMoveStep(1)}
      disabled={disabled || stepIndex === count - 1}
    >
      <ArrowDownwardRoundedIcon fontSize="small" />
    </IconButton>
    <IconButton
      aria-label={`Remove step ${stepIndex + 1}`}
      size="small"
      onClick={onRemoveStep}
      disabled={disabled || count === 1}
    >
      <DeleteOutlineRoundedIcon fontSize="small" />
    </IconButton>
  </Stack>
);

/** A question's name for a screen reader, never its internal id. */
const questionLabel = (field: FormField | undefined): string =>
  field?.label.trim() || 'Untitled question';

/**
 * What a screen reader hears while a question is moved with the keyboard.
 * dnd-kit would otherwise read out each question's internal id, such as
 * `short-text-lx2k…`, which means nothing to the person building the form.
 *
 * `lastOver` remembers where the question was last said to be: a pickup is
 * at once "over" its own place, and announcing that would replace the
 * pickup message in the live region before it was read.
 */
const reorderAnnouncements = (
  fields: readonly FormField[],
  lastOver: MutableRefObject<UniqueIdentifier | null>,
): Announcements => {
  const count = fields.length;
  const positionOf = (id: UniqueIdentifier): number =>
    fields.findIndex((field) => field.id === String(id)) + 1;
  const labelOf = (id: UniqueIdentifier): string =>
    questionLabel(fields.find((field) => field.id === String(id)));
  const movedTo = (active: UniqueIdentifier, over: UniqueIdentifier | undefined): string =>
    `Question ${labelOf(active)} moved to position ${positionOf(over ?? active)} of ${count}.`;
  return {
    onDragStart: ({ active }) => {
      lastOver.current = active.id;
      return `Picked up question ${positionOf(active.id)} of ${count}, ${labelOf(active.id)}.`;
    },
    onDragOver: ({ active, over }) => {
      if (!over || over.id === lastOver.current) return undefined;
      lastOver.current = over.id;
      return movedTo(active.id, over.id);
    },
    onDragEnd: ({ active, over }) => {
      lastOver.current = null;
      return movedTo(active.id, over?.id);
    },
    onDragCancel: ({ active }) => {
      lastOver.current = null;
      return `Move cancelled. ${labelOf(active.id)} stays at position ${positionOf(active.id)}.`;
    },
  };
};

export interface StepSectionProps {
  steps: readonly FormStep[];
  stepIndex: number;
  onStepChange: (step: FormStep) => void;
  onMoveStep: (offset: -1 | 1) => void;
  onRemoveStep: () => void;
  onAddField: (type: FormFieldType) => void;
  onMoveField: (from: number, to: number) => void;
  onMoveFieldToStep: (fieldId: string, stepId: string) => void;
  onDuplicateField: (fieldIndex: number) => void;
  onRemoveField: (field: FormField) => void;
  expandedId: string | null;
  onToggleField: (fieldId: string) => void;
  /** Every problem in the form, from `formDefinitionProblems`. */
  problems: readonly string[];
  showErrors: boolean;
  disabled: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * One step of the form, as the applicant will see it on one screen: its title
 * and introduction, when it is shown, and its questions in order.
 */
export const StepSection = ({
  steps,
  stepIndex,
  onStepChange,
  onMoveStep,
  onRemoveStep,
  onAddField,
  onMoveField,
  onMoveFieldToStep,
  onDuplicateField,
  onRemoveField,
  expandedId,
  onToggleField,
  problems,
  showErrors,
  disabled,
  onUploadingChange,
}: StepSectionProps): JSX.Element => {
  const step = steps[stepIndex] as FormStep;
  const [settingsOpen, setSettingsOpen] = useState(Boolean(step.visibility || step.image));
  const lastOver = useRef<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const set = (patch: Partial<FormStep>): void => onStepChange({ ...step, ...patch });
  const setField = (index: number, field: FormField): void =>
    set({ fields: step.fields.map((current, position) => (position === index ? field : current)) });
  const stepProblems = problemsForStep(problems, step);
  const titleMissing = showErrors && step.title.trim() === '';
  const headingId = `step-${step.id}-heading`;

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return;
    const from = step.fields.findIndex((field) => field.id === active.id);
    const to = step.fields.findIndex((field) => field.id === over.id);
    if (from !== -1 && to !== -1) onMoveField(from, to);
  };

  return (
    <Card
      component="section"
      variant="outlined"
      aria-labelledby={headingId}
      sx={{ borderRadius: 3, overflow: 'visible' }}
    >
      <StepHeader
        headingId={headingId}
        title={step.title}
        stepIndex={stepIndex}
        count={steps.length}
        onMoveStep={onMoveStep}
        onRemoveStep={onRemoveStep}
        disabled={disabled}
      />
      <Stack spacing={2.5} sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1.4fr' } }}>
          <TextField
            label="Step title"
            value={step.title}
            onChange={(event) => set({ title: event.target.value })}
            required
            disabled={disabled}
            error={titleMissing}
            helperText={titleMissing ? 'Give this step a title.' : 'The heading of this screen.'}
            slotProps={{ htmlInput: { maxLength: 160 } }}
            fullWidth
          />
          <TextField
            label="Step description"
            value={step.description ?? ''}
            onChange={(event) => set({ description: event.target.value || undefined })}
            disabled={disabled}
            helperText="Optional. A line under the title saying what this step is about."
            slotProps={{ htmlInput: { maxLength: 1000 } }}
            fullWidth
          />
        </Box>
        <Box>
          <Button
            size="small"
            startIcon={<TuneRoundedIcon />}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
          >
            {settingsOpen ? 'Hide picture and condition' : 'Picture and condition'}
          </Button>
          <Collapse in={settingsOpen} unmountOnExit>
            <Stack spacing={2.5} sx={{ mt: 2 }}>
              <MediaUploadField
                label="Step picture (optional)"
                accept="image/*"
                preview
                value={step.image ?? undefined}
                onChange={(image) => set({ image: image ?? null })}
                onUploadingChange={onUploadingChange}
                folder="site"
              />
              <VisibilityRuleEditor
                value={step.visibility}
                onChange={(visibility) => set({ visibility })}
                candidates={questionsBefore(steps, stepIndex, 0)}
                subject="step"
                disabled={disabled}
              />
            </Stack>
          </Collapse>
        </Box>
        {stepProblems.length > 0 && (
          <Alert severity="warning">
            {stepProblems.map((problem) => (
              <div key={problem}>{problem}</div>
            ))}
          </Alert>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements: reorderAnnouncements(step.fields, lastOver) }}
        >
          <SortableContext
            items={step.fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack
              spacing={1.25}
              role="list"
              aria-label={`Questions in ${step.title || 'this step'}`}
            >
              {step.fields.map((field, fieldIndex) => (
                <Box role="listitem" key={field.id}>
                  <QuestionCard
                    field={field}
                    index={fieldIndex}
                    count={step.fields.length}
                    steps={steps}
                    stepId={step.id}
                    expanded={expandedId === field.id}
                    onToggle={() => onToggleField(field.id)}
                    onChange={(next) => setField(fieldIndex, next)}
                    onMove={(offset) => onMoveField(fieldIndex, fieldIndex + offset)}
                    onMoveToStep={(stepId) => onMoveFieldToStep(field.id, stepId)}
                    onDuplicate={() => onDuplicateField(fieldIndex)}
                    onRemove={() => onRemoveField(field)}
                    earlierFields={questionsBefore(steps, stepIndex, fieldIndex)}
                    problems={problemsForField(problems, field)}
                    showErrors={showErrors}
                    disabled={disabled}
                  />
                </Box>
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
        {step.fields.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No questions on this step yet. A step with no questions shows its title and description
            as a page to read, which suits an introduction or a thank-you.
          </Typography>
        )}
        <Box>
          <AddQuestionButton
            onAdd={onAddField}
            stepTitle={step.title}
            disabled={disabled || step.fields.length >= MAX_FIELDS_PER_STEP}
          />
        </Box>
      </Stack>
    </Card>
  );
};
