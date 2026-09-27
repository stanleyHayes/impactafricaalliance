import type { FormStep } from '@iaa/shared';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { MediaUploadField } from '../../components/fields/MediaUploadField';
import { OptionSelect } from '../../components/fields/OptionSelect';
import { TagsField } from '../../components/fields/TagsField';
import { InstantField } from '../../components/form-builder/InstantField';
import { formatInstant, publicFormUrl } from '../../lib/forms';
import { FORM_TYPE_OPTIONS } from '../../lib/select-options';

import {
  FORM_EDITOR_STEPS,
  publishChecklist,
  slugFromTitle,
  type FormEditorState,
} from './form-editor-model';

export type SetField = <K extends keyof FormEditorState>(key: K, value: FormEditorState[K]) => void;

export interface StepProps {
  form: FormEditorState;
  setField: SetField;
  disabled: boolean;
}

/** Title, address, purpose and a note for the team. */
export const BasicsStep = ({ form, setField, disabled }: StepProps): JSX.Element => (
  <>
    <TextField
      label="Title"
      value={form.title}
      required
      disabled={disabled}
      onChange={(event) => {
        setField('title', event.target.value);
        // The address follows the title until someone chooses it themselves.
        if (!form.slugTouched) setField('slug', slugFromTitle(event.target.value));
      }}
      helperText="Shown at the top of the public page and in the dashboard."
      slotProps={{ htmlInput: { maxLength: 160 } }}
      fullWidth
    />
    <TextField
      label="Address"
      value={form.slug}
      required
      disabled={disabled}
      onChange={(event) => {
        setField('slug', event.target.value.toLowerCase());
        setField('slugTouched', true);
      }}
      helperText={
        form.live
          ? `The form is live at ${publicFormUrl(form.slug || 'your-form')}. Changing the address breaks links you have already shared.`
          : `The form's link: ${publicFormUrl(form.slug || 'your-form')}`
      }
      slotProps={{ htmlInput: { maxLength: 120 } }}
      fullWidth
    />
    <OptionSelect
      label="What the form is for"
      options={FORM_TYPE_OPTIONS}
      value={form.type}
      onChange={(type) => setField('type', type as FormEditorState['type'])}
      disabled={disabled}
    />
    <TextField
      label="Note for the team"
      value={form.description}
      disabled={disabled}
      onChange={(event) => setField('description', event.target.value)}
      multiline
      minRows={2}
      helperText="Optional and internal: never shown to applicants."
      slotProps={{ htmlInput: { maxLength: 500 } }}
      fullWidth
    />
  </>
);

/** The cover slide applicants see before Begin. */
export const IntroductionStep = ({
  form,
  setField,
  disabled,
  onUploadingChange,
}: StepProps & { onUploadingChange: (uploading: boolean) => void }): JSX.Element => (
  <>
    <Typography variant="body2" color="text.secondary">
      The first thing applicants see. Leave it empty and the form&apos;s title stands in as the
      heading.
    </Typography>
    <TextField
      label="Heading"
      value={form.introHeading}
      disabled={disabled}
      onChange={(event) => setField('introHeading', event.target.value)}
      helperText="Speak to the applicant, such as “Speak at an Impact Africa Alliance event”."
      slotProps={{ htmlInput: { maxLength: 160 } }}
      fullWidth
    />
    <TextField
      label="Description"
      value={form.introDescription}
      disabled={disabled}
      onChange={(event) => setField('introDescription', event.target.value)}
      multiline
      minRows={4}
      helperText="Who should apply, how long it takes, and that answers are saved as they go."
      slotProps={{ htmlInput: { maxLength: 2000 } }}
      fullWidth
    />
    <MediaUploadField
      label="Cover picture (optional)"
      accept="image/*"
      preview
      value={form.introImage ?? undefined}
      onChange={(image) => setField('introImage', image ?? null)}
      onUploadingChange={onUploadingChange}
      folder="site"
    />
  </>
);

/** When the form takes answers, how many, and whether answers are saved as people go. */
export const ScheduleStep = ({
  form,
  setField,
  disabled,
  onDateProblem,
}: StepProps & {
  onDateProblem: (field: 'opensAt' | 'closesAt', problem: string | null) => void;
}): JSX.Element => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <>
      <Typography variant="body2" color="text.secondary">
        Times are in your time zone ({timezone}). Leave both empty to take applications for as long
        as the form is published.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <InstantField
          label="Opens at"
          value={form.opensAt}
          onChange={(value) => setField('opensAt', value)}
          onProblemChange={(problem) => onDateProblem('opensAt', problem)}
          helperText="Optional. Before this, the page says when applications open."
          disabled={disabled}
        />
        <InstantField
          label="Closes at"
          value={form.closesAt}
          onChange={(value) => setField('closesAt', value)}
          onProblemChange={(problem) => onDateProblem('closesAt', problem)}
          helperText="Optional. After this, the page says applications have closed."
          disabled={disabled}
        />
      </Box>
      <TextField
        label="Most applications"
        value={form.submissionLimit}
        disabled={disabled}
        onChange={(event) => setField('submissionLimit', event.target.value)}
        slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
        helperText="Optional. The form stops taking applications once this many have been sent."
        fullWidth
      />
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={form.allowDrafts}
              onChange={(_event, checked) => setField('allowDrafts', checked)}
              disabled={disabled}
            />
          }
          label="Let applicants save and come back later"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 6 } }}>
          Answers are saved as people type, and they can ask for a link by email to finish on
          another day. Drafts are deleted after 30 days untouched. Turn this off for short forms, or
          where you would rather keep nothing until people press Submit.
        </Typography>
      </Box>
    </>
  );
};

/** What applicants see and receive when they submit, and who on the team hears about it. */
export const ConfirmationStep = ({ form, setField, disabled }: StepProps): JSX.Element => (
  <>
    <TextField
      label="Message after submitting"
      value={form.successMessage}
      disabled={disabled}
      onChange={(event) => setField('successMessage', event.target.value)}
      multiline
      minRows={3}
      helperText="Optional. Shown with their reference number, such as what happens next and when."
      slotProps={{ htmlInput: { maxLength: 1000 } }}
      fullWidth
    />
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={form.acknowledgeApplicant}
            onChange={(_event, checked) => setField('acknowledgeApplicant', checked)}
            disabled={disabled}
          />
        }
        label="Email applicants their reference number"
      />
      <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 6 } }}>
        Sent to the question you marked as the applicant&apos;s email, with the message above. It
        never includes their answers.
      </Typography>
    </Box>
    <TagsField
      label="Tell these colleagues about each application"
      value={form.notifyEmails}
      onChange={(emails) => setField('notifyEmails', emails)}
      helperText="Up to five email addresses; press Enter after each. Leave empty to use the site's notification address. The email names the applicant and links to the dashboard; the answers stay there."
    />
  </>
);

const SummaryRow = ({
  label,
  children,
  onEdit,
}: {
  label: string;
  children: ReactNode;
  onEdit: () => void;
}): JSX.Element => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="flex-start"
    sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {label}
      </Typography>
      <Box sx={{ overflowWrap: 'anywhere' }}>{children}</Box>
    </Box>
    <Button
      size="small"
      startIcon={<EditRoundedIcon />}
      onClick={onEdit}
      aria-label={`Edit ${label.toLowerCase()}`}
    >
      Edit
    </Button>
  </Stack>
);

const questionCount = (steps: readonly FormStep[]): number =>
  steps.reduce((total, step) => total + step.fields.length, 0);

const scheduleText = (form: FormEditorState): string => {
  const opens = form.opensAt ? `Opens ${formatInstant(form.opensAt)}` : 'Opens when published';
  const closes = form.closesAt ? `closes ${formatInstant(form.closesAt)}` : 'no closing date';
  return `${opens}; ${closes}.`;
};

/** What stands between the form and being published, or, for a live form, being saved. */
const PublishChecklist = ({
  checklist,
  live,
}: {
  checklist: readonly string[];
  live: boolean;
}): JSX.Element => {
  if (checklist.length === 0) {
    return (
      <Alert severity="success" icon={<CheckCircleOutlineRoundedIcon />}>
        <AlertTitle>{live ? 'Still ready for applicants' : 'Ready to publish'}</AlertTitle>
        {live
          ? 'Saving changes the live form straight away.'
          : "Nothing stands in the way. After saving, an administrator publishes it from the form's page."}
      </Alert>
    );
  }
  return (
    <Alert severity={live ? 'error' : 'warning'}>
      <AlertTitle>
        {live ? 'Fix these before saving this live form' : 'Before this form can be published'}
      </AlertTitle>
      {live
        ? 'Applicants are using this form, so it has to stay ready for them.'
        : 'You can save now and come back to these.'}
      <List dense disablePadding>
        {checklist.map((problem) => (
          <ListItem key={problem} disableGutters>
            <ListItemIcon sx={{ minWidth: 32, color: live ? 'error.main' : 'warning.main' }}>
              <ErrorOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={problem} />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
};

/** Everything at a glance, with a way back to each part, and what publishing will need. */
export const ReviewStep = ({
  form,
  goTo,
}: {
  form: FormEditorState;
  goTo: (step: number) => void;
}): JSX.Element => {
  const checklist = publishChecklist(form);
  const type = FORM_TYPE_OPTIONS.find((option) => option.value === form.type)?.label;
  return (
    <>
      <Box>
        <SummaryRow label={FORM_EDITOR_STEPS[0]} onEdit={() => goTo(0)}>
          <Typography sx={{ fontWeight: 600 }}>{form.title || 'No title yet'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {type} · {publicFormUrl(form.slug)}
          </Typography>
        </SummaryRow>
        <SummaryRow label={FORM_EDITOR_STEPS[1]} onEdit={() => goTo(1)}>
          <Typography variant="body2">
            {form.introHeading.trim() || `No cover heading: “${form.title}” stands in.`}
          </Typography>
        </SummaryRow>
        <SummaryRow label={FORM_EDITOR_STEPS[2]} onEdit={() => goTo(2)}>
          <Typography variant="body2">
            {form.steps.length} {form.steps.length === 1 ? 'step' : 'steps'},{' '}
            {questionCount(form.steps)} questions:{' '}
            {form.steps.map((step) => step.title).join(' · ')}
          </Typography>
        </SummaryRow>
        <SummaryRow label={FORM_EDITOR_STEPS[3]} onEdit={() => goTo(3)}>
          <Typography variant="body2">{scheduleText(form)}</Typography>
          <Typography variant="body2" color="text.secondary">
            {form.submissionLimit.trim()
              ? `Up to ${form.submissionLimit.trim()} applications.`
              : 'No limit on applications.'}{' '}
            {form.allowDrafts
              ? 'Applicants can save and come back.'
              : 'Nothing is kept until Submit.'}
          </Typography>
        </SummaryRow>
        <SummaryRow label={FORM_EDITOR_STEPS[4]} onEdit={() => goTo(4)}>
          <Typography variant="body2">
            {form.acknowledgeApplicant
              ? 'Applicants are emailed their reference.'
              : 'Applicants are not emailed.'}{' '}
            {form.notifyEmails.length > 0
              ? `Notifies ${form.notifyEmails.join(', ')}.`
              : "Notifies the site's notification address."}
          </Typography>
        </SummaryRow>
      </Box>
      <PublishChecklist checklist={checklist} live={Boolean(form.live)} />
      {!form.live && (
        <Typography variant="body2" color="text.secondary">
          Saving never publishes. Publishing happens on the form&apos;s own page, and only an
          administrator can do it, because the page collects personal data.
        </Typography>
      )}
    </>
  );
};
