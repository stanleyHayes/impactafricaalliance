import type { ProjectStatus } from '@iaa/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { usePeople } from '../../lib/people';
import {
  PROGRAMME_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  WORK_PRIORITY_OPTIONS,
  withAnyOption,
} from '../../lib/select-options';
import { DateField } from '../fields/DateField';
import { MediaUploadField } from '../fields/MediaUploadField';
import { OptionSelect } from '../fields/OptionSelect';
import { TagsField } from '../fields/TagsField';
import { ReviewSummary } from '../forms/ReviewSummary';
import { Markdown } from '../markdown/Markdown';
import { MarkdownEditor } from '../markdown/MarkdownEditor';
import { UserPicker } from '../people/UserPicker';

import {
  editorStatuses,
  PROJECT_FORM_STEPS,
  type FieldErrors,
  type ProjectFormState,
} from './project-form';
import {
  formatDateRange,
  priorityLabel,
  programmeLabel,
  sdgLabel,
  statusLabel,
} from './project-format';
import { ObjectivesField, PartnersField, SdgField } from './ProjectScopeFields';

export type SetProjectField = <K extends keyof ProjectFormState>(
  key: K,
  value: ProjectFormState[K],
) => void;

export type ProjectDateField = 'startDate' | 'endDate';

export interface ProjectStepProps {
  form: ProjectFormState;
  setField: SetProjectField;
  errors: FieldErrors;
  disabled: boolean;
  /**
   * A date field's own objection (half typed, impossible, out of order), or
   * null. The editor holds the step while one is set, since the field keeps
   * the old date rather than pass such a day on.
   */
  onDateProblem?: (field: ProjectDateField, problem: string | null) => void;
}

const SUMMARY_MAX = 400;

const PROGRAMME_CHOICES = withAnyOption(
  PROGRAMME_OPTIONS,
  'No programme',
  'Not tied to one programme area.',
);

/** Two fields side by side from a tablet up, stacked on a phone. */
const Pair = ({ children }: { children: ReactNode }): JSX.Element => (
  <Box
    sx={{
      display: 'grid',
      gap: 3,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
    }}
  >
    {children}
  </Box>
);

export const BasicsStep = ({
  form,
  setField,
  errors,
  disabled,
  savedStatus,
  onTitleChange,
  onSlugChange,
}: ProjectStepProps & {
  /** The status the project was saved with, or null for a new project. */
  savedStatus: ProjectStatus | null;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
}): JSX.Element => {
  const allowed = new Set(editorStatuses(savedStatus));
  return (
    <>
      <TextField
        label="Title"
        required
        value={form.title}
        onChange={(event) => onTitleChange(event.target.value)}
        error={Boolean(errors.title)}
        helperText={errors.title ?? 'What the team calls it, such as "Digital Skills Hub, Tamale".'}
        slotProps={{ htmlInput: { maxLength: 160 } }}
        disabled={disabled}
      />
      <TextField
        label="Slug"
        required
        value={form.slug}
        onChange={(event) => onSlugChange(event.target.value)}
        error={Boolean(errors.slug)}
        helperText={
          errors.slug ??
          (form.slugTouched
            ? 'Lowercase words joined by hyphens. It names the project in links and exports.'
            : 'Filled in from the title until you change it.')
        }
        slotProps={{ htmlInput: { maxLength: 120, spellCheck: false } }}
        disabled={disabled}
      />
      <TextField
        label="Summary"
        required
        multiline
        minRows={3}
        value={form.summary}
        onChange={(event) => setField('summary', event.target.value)}
        error={Boolean(errors.summary)}
        helperText={
          errors.summary ??
          `One or two sentences on what the project does and for whom. ${form.summary.length} of ${SUMMARY_MAX}.`
        }
        slotProps={{ htmlInput: { maxLength: SUMMARY_MAX } }}
        disabled={disabled}
      />
      <Pair>
        <OptionSelect
          label="Status"
          options={PROJECT_STATUS_OPTIONS.filter((option) =>
            allowed.has(option.value as ProjectStatus),
          )}
          value={form.status}
          onChange={(value) => setField('status', value as ProjectStatus)}
          error={errors.status}
          helperText={
            savedStatus
              ? 'Only the moves this project can make from where it is now are offered.'
              : 'Draft is fine while you are still working it out.'
          }
          disabled={disabled}
        />
        <OptionSelect
          label="Priority"
          options={WORK_PRIORITY_OPTIONS}
          value={form.priority}
          onChange={(value) => setField('priority', value as ProjectFormState['priority'])}
          error={errors.priority}
          disabled={disabled}
        />
      </Pair>
    </>
  );
};

export const PeopleStep = ({ form, setField, errors, disabled }: ProjectStepProps): JSX.Element => (
  <>
    <UserPicker
      label="Project lead"
      value={form.leadId}
      onChange={(value) => setField('leadId', value)}
      error={errors.leadId}
      helperText="The person answerable for the project. You can leave this for now."
      disabled={disabled}
    />
    <UserPicker
      multiple
      label="Members"
      value={form.memberIds}
      onChange={(value) => setField('memberIds', value)}
      error={errors.memberIds}
      helperText="Everyone working on it. Members see it under My projects."
      max={50}
      disabled={disabled}
    />
  </>
);

export const ScheduleStep = ({
  form,
  setField,
  errors,
  disabled,
  onDateProblem,
}: ProjectStepProps): JSX.Element => (
  <>
    <Pair>
      <DateField
        label="Start date"
        value={form.startDate}
        onChange={(value) => setField('startDate', value)}
        onProblemChange={(problem) => onDateProblem?.('startDate', problem)}
        error={errors.startDate}
        maxDate={form.endDate}
        disabled={disabled}
      />
      <DateField
        label="End date"
        value={form.endDate}
        onChange={(value) => setField('endDate', value)}
        onProblemChange={(problem) => onDateProblem?.('endDate', problem)}
        error={errors.endDate}
        minDate={form.startDate}
        disabled={disabled}
      />
    </Pair>
    <Pair>
      <TextField
        label="Country"
        value={form.country}
        onChange={(event) => setField('country', event.target.value)}
        error={Boolean(errors.country)}
        helperText={errors.country}
        slotProps={{ htmlInput: { maxLength: 80 } }}
        disabled={disabled}
      />
      <TextField
        label="Region"
        value={form.region}
        onChange={(event) => setField('region', event.target.value)}
        error={Boolean(errors.region)}
        helperText={errors.region ?? 'Such as Northern Region.'}
        slotProps={{ htmlInput: { maxLength: 120 } }}
        disabled={disabled}
      />
    </Pair>
    <TextField
      label="Where the work happens"
      value={form.locationText}
      onChange={(event) => setField('locationText', event.target.value)}
      error={Boolean(errors.locationText)}
      helperText={errors.locationText ?? 'In words, such as "Tamale and surrounding districts".'}
      slotProps={{ htmlInput: { maxLength: 200 } }}
      disabled={disabled}
    />
  </>
);

export const ScopeStep = ({ form, setField, errors, disabled }: ProjectStepProps): JSX.Element => (
  <>
    <OptionSelect
      label="Programme"
      options={PROGRAMME_CHOICES}
      value={form.programme}
      onChange={(value) => setField('programme', value)}
      error={errors.programme}
      helperText="The programme area on the website this project belongs to."
      disabled={disabled}
    />
    <ObjectivesField
      value={form.objectives}
      onChange={(value) => setField('objectives', value)}
      errors={errors}
      disabled={disabled}
    />
    <PartnersField
      value={form.partners}
      onChange={(value) => setField('partners', value)}
      errors={errors}
      disabled={disabled}
    />
    <SdgField
      value={form.sdgs}
      onChange={(value) => setField('sdgs', value)}
      error={errors.sdgs}
      disabled={disabled}
    />
    <TagsField
      label="Tags"
      value={form.tags}
      onChange={(value) => setField('tags', value)}
      error={errors.tags}
      helperText="Words that help find the project later. Press Enter or a comma after each."
    />
  </>
);

export const StoryStep = ({
  form,
  setField,
  errors,
  disabled,
  onUploadingChange,
}: ProjectStepProps & { onUploadingChange: (uploading: boolean) => void }): JSX.Element => (
  <>
    <MarkdownEditor
      label="Description"
      value={form.description}
      onChange={(value) => setField('description', value)}
      error={errors.description}
      minRows={8}
    />
    <MediaUploadField
      label="Cover image"
      accept="image/*"
      preview
      folder="projects"
      value={form.cover}
      onChange={(asset) => setField('cover', asset)}
      onUploadingChange={onUploadingChange}
    />
    <TextField
      label="Reference code"
      value={form.code}
      onChange={(event) => setField('code', event.target.value)}
      error={Boolean(errors.code)}
      helperText={
        errors.code ?? 'A short reference for conversation and file names, such as DSH-2026.'
      }
      slotProps={{ htmlInput: { maxLength: 40 } }}
      disabled={disabled}
    />
  </>
);

/** A step's name, as the step rail shows it, for its section of the review. */
const stepTitle = (step: number): string => PROJECT_FORM_STEPS[step] ?? '';

export const ReviewStep = ({
  form,
  onEdit,
  disabled,
}: {
  form: ProjectFormState;
  onEdit: (step: number) => void;
  disabled: boolean;
}): JSX.Element => {
  const people = usePeople([...(form.leadId ? [form.leadId] : []), ...form.memberIds]);
  // Names arrive a moment after the step opens; until then nobody is called a former colleague.
  const nameOf = (id: string): string => {
    const person = people.data?.find((candidate) => candidate.id === id);
    if (person) return person.name;
    return people.isPending ? 'Loading…' : 'Someone no longer on the team';
  };
  const partners = form.partners.filter((row) => row.name.trim());
  const objectives = form.objectives.map((line) => line.trim()).filter(Boolean);
  const sdgs = [...form.sdgs].sort((a, b) => a - b);
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Check the details below. Nothing is saved until you choose the button at the bottom.
      </Typography>
      <ReviewSummary
        onEdit={onEdit}
        disabled={disabled}
        sections={[
          {
            title: stepTitle(0),
            step: 0,
            items: [
              { label: 'Title', value: form.title },
              { label: 'Slug', value: form.slug },
              { label: 'Status', value: statusLabel(form.status) },
              { label: 'Priority', value: priorityLabel(form.priority) },
              { label: 'Summary', value: form.summary, fullRow: true },
            ],
          },
          {
            title: stepTitle(1),
            step: 1,
            items: [
              { label: 'Lead', value: form.leadId ? nameOf(form.leadId) : '' },
              { label: 'Members', value: form.memberIds.map(nameOf).join(', '), fullRow: true },
            ],
          },
          {
            title: stepTitle(2),
            step: 2,
            items: [
              { label: 'Dates', value: formatDateRange(form.startDate, form.endDate) },
              { label: 'Country', value: form.country.trim() },
              { label: 'Region', value: form.region.trim() },
              { label: 'Where', value: form.locationText.trim() },
            ],
          },
          {
            title: stepTitle(3),
            step: 3,
            items: [
              { label: 'Programme', value: programmeLabel(form.programme) },
              { label: 'Tags', value: form.tags.join(', ') },
              {
                label: 'Objectives',
                fullRow: true,
                value:
                  objectives.length > 0 ? (
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                      {objectives.map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </Box>
                  ) : null,
              },
              {
                label: 'Partners',
                value: partners
                  .map((row) => (row.role ? `${row.name} (${row.role})` : row.name))
                  .join(', '),
              },
              {
                label: 'Sustainable Development Goals',
                fullRow: true,
                value:
                  sdgs.length > 0 ? (
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      flexWrap="wrap"
                      component="span"
                    >
                      {sdgs.map((goal) => (
                        <Chip key={goal} size="small" label={sdgLabel(goal)} component="span" />
                      ))}
                    </Stack>
                  ) : null,
              },
            ],
          },
          {
            title: stepTitle(4),
            step: 4,
            items: [
              { label: 'Reference code', value: form.code.trim() },
              {
                label: 'Cover image',
                value: form.cover ? (
                  <Box
                    component="img"
                    src={form.cover.url}
                    alt={form.cover.alt ?? 'Cover image'}
                    sx={{
                      display: 'block',
                      width: '100%',
                      maxWidth: 280,
                      borderRadius: 2,
                      mt: 0.5,
                    }}
                  />
                ) : null,
              },
              {
                label: 'Description',
                fullRow: true,
                value: form.description.trim() ? (
                  <Box sx={{ maxHeight: 280, overflow: 'auto', fontWeight: 400 }}>
                    <Markdown>{form.description}</Markdown>
                  </Box>
                ) : null,
              },
            ],
          },
        ]}
      />
    </Stack>
  );
};

export interface ProjectStepContentProps {
  step: number;
  stepProps: ProjectStepProps;
  savedStatus: ProjectStatus | null;
  onTitleChange: (title: string) => void;
  onSlugChange: (slug: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  onEdit: (step: number) => void;
}

/** The fields of one step, looked up by its position in `PROJECT_FORM_STEPS`. */
export const ProjectStepContent = ({
  step,
  stepProps,
  savedStatus,
  onTitleChange,
  onSlugChange,
  onUploadingChange,
  onEdit,
}: ProjectStepContentProps): JSX.Element | null => {
  const steps: Record<number, () => JSX.Element> = {
    0: () => (
      <BasicsStep
        {...stepProps}
        savedStatus={savedStatus}
        onTitleChange={onTitleChange}
        onSlugChange={onSlugChange}
      />
    ),
    1: () => <PeopleStep {...stepProps} />,
    2: () => <ScheduleStep {...stepProps} />,
    3: () => <ScopeStep {...stepProps} />,
    4: () => <StoryStep {...stepProps} onUploadingChange={onUploadingChange} />,
    5: () => <ReviewStep form={stepProps.form} onEdit={onEdit} disabled={stepProps.disabled} />,
  };
  return steps[step]?.() ?? null;
};
