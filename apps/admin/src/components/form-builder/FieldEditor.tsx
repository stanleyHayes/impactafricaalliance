import {
  DEFAULT_MAX_FILE_MB,
  FILE_KINDS,
  isChoiceFieldType,
  MAX_FILE_MB,
  MAX_FILES_PER_QUESTION,
  type ApplicantMapping,
  type FieldValidation,
  type FileKind,
  type FormField,
  type FormFieldType,
} from '@iaa/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { APPLICANT_MAPPING_OPTIONS, FILE_KIND_OPTIONS } from '../../lib/select-options';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';

import { optionsText, syncOptions } from './builder-model';
import { VisibilityRuleEditor } from './VisibilityRuleEditor';

const PLACEHOLDER_TYPES: readonly FormFieldType[] = [
  'short-text',
  'long-text',
  'email',
  'phone',
  'url',
  'number',
];

// Which applicant detail each type of question can supply; mirrors the rule
// `formDefinitionProblems` checks, so the menu never offers a mapping it refuses.
const MAPPINGS_FOR: Partial<Record<FormFieldType, ApplicantMapping[]>> = {
  'short-text': ['applicant-name', 'applicant-phone'],
  email: ['applicant-email'],
  phone: ['applicant-phone'],
};

const NO_MAPPING: SelectChoice = {
  value: '',
  label: 'Not one of their details',
  description: 'An ordinary question.',
};

interface LimitPair {
  min: keyof FieldValidation;
  max: keyof FieldValidation;
  minLabel: string;
  maxLabel: string;
  helper: string;
}

const LIMITS: Partial<Record<FormFieldType, LimitPair>> = {
  'short-text': {
    min: 'minLength',
    max: 'maxLength',
    minLabel: 'Fewest characters',
    maxLabel: 'Most characters',
    helper: 'Leave empty for no limit.',
  },
  'long-text': {
    min: 'minLength',
    max: 'maxLength',
    minLabel: 'Fewest characters',
    maxLabel: 'Most characters',
    helper: 'A minimum makes people write more than a line; leave empty for no limit.',
  },
  number: {
    min: 'min',
    max: 'max',
    minLabel: 'Lowest allowed',
    maxLabel: 'Highest allowed',
    helper: 'Leave empty for no limit.',
  },
  'multi-select': {
    min: 'min',
    max: 'max',
    minLabel: 'Fewest choices',
    maxLabel: 'Most choices',
    helper: 'How many options people may pick. Leave empty for any number.',
  },
};

/** A validation object with empty entries dropped, or undefined when nothing is left. */
const cleanValidation = (validation: FieldValidation): FieldValidation | undefined => {
  const entries = Object.entries(validation).filter(
    ([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0),
  );
  return entries.length > 0 ? (Object.fromEntries(entries) as FieldValidation) : undefined;
};

const NumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}): JSX.Element => (
  <TextField
    label={label}
    type="number"
    value={value ?? ''}
    disabled={disabled}
    onChange={(event) => {
      const text = event.target.value;
      const parsed = Number(text);
      onChange(text === '' || !Number.isFinite(parsed) ? undefined : parsed);
    }}
    slotProps={{ htmlInput: { min, max } }}
    fullWidth
  />
);

/**
 * One label per line. The text is kept apart from the options, so a new line
 * can be started without the empty line vanishing under the cursor; the
 * options are worked out from it on every change.
 */
const OptionsInput = ({
  field,
  onChange,
  disabled,
  showErrors,
}: {
  field: FormField;
  onChange: (field: FormField) => void;
  disabled?: boolean;
  showErrors?: boolean;
}): JSX.Element => {
  const [text, setText] = useState(() => optionsText(field.options));
  const empty = field.options.length === 0;
  return (
    <TextField
      label="Options"
      value={text}
      multiline
      minRows={3}
      disabled={disabled}
      onChange={(event) => {
        setText(event.target.value);
        onChange({ ...field, options: syncOptions(event.target.value, field.options) });
      }}
      error={Boolean(showErrors && empty)}
      helperText={
        showErrors && empty
          ? 'Add at least one option.'
          : 'One option per line. Renaming an option keeps the answers already given to it.'
      }
      fullWidth
    />
  );
};

const FileSettings = ({
  field,
  setValidation,
  disabled,
}: {
  field: FormField;
  setValidation: (patch: Partial<FieldValidation>) => void;
  disabled?: boolean;
}): JSX.Element => {
  const kinds = field.validation?.fileKinds ?? [];
  const toggle = (kind: FileKind, checked: boolean): void =>
    setValidation({
      fileKinds: FILE_KINDS.filter((candidate) =>
        candidate === kind ? checked : kinds.includes(candidate),
      ),
    });
  return (
    <Stack spacing={2}>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
        <FormLabel component="legend" sx={{ mb: 0.5 }}>
          Kinds of file accepted
        </FormLabel>
        <Typography variant="body2" color="text.secondary">
          Tick none to accept every kind below.
        </Typography>
        <FormGroup>
          {FILE_KIND_OPTIONS.map((option) => (
            <FormControlLabel
              key={option.value}
              control={
                <Checkbox
                  checked={kinds.includes(option.value as FileKind)}
                  onChange={(_event, checked) => toggle(option.value as FileKind, checked)}
                  disabled={disabled}
                />
              }
              label={
                <span>
                  {option.label}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}
                    · {option.description}
                  </Typography>
                </span>
              }
            />
          ))}
        </FormGroup>
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <NumberInput
          label="Most files"
          value={field.validation?.maxFiles}
          onChange={(maxFiles) => setValidation({ maxFiles })}
          min={1}
          max={MAX_FILES_PER_QUESTION}
          disabled={disabled}
        />
        <NumberInput
          label="Largest file (MB)"
          value={field.validation?.maxSizeMB}
          onChange={(maxSizeMB) => setValidation({ maxSizeMB })}
          min={1}
          max={MAX_FILE_MB}
          disabled={disabled}
        />
      </Box>
      <Typography variant="body2" color="text.secondary">
        One file of up to {DEFAULT_MAX_FILE_MB} MB unless you say otherwise; no file can be larger
        than {MAX_FILE_MB} MB. Files are private: only colleagues who can read applications can open
        them.
      </Typography>
    </Stack>
  );
};

interface PartProps {
  field: FormField;
  set: (patch: Partial<FormField>) => void;
  showErrors: boolean;
  disabled: boolean;
}

/** The words: the question itself, its help text and, for typed answers, a placeholder. */
const WordingFields = ({ field, set, showErrors, disabled }: PartProps): JSX.Element => {
  const labelMissing = showErrors && field.label.trim() === '';
  return (
    <>
      <TextField
        label="Question"
        value={field.label}
        onChange={(event) => set({ label: event.target.value })}
        required
        disabled={disabled}
        error={labelMissing}
        helperText={labelMissing ? 'Give this question a label.' : 'What the applicant is asked.'}
        slotProps={{ htmlInput: { maxLength: 300 } }}
        fullWidth
      />
      <TextField
        label="Help text"
        value={field.helpText ?? ''}
        onChange={(event) => set({ helpText: event.target.value || undefined })}
        disabled={disabled}
        helperText="Optional. A line under the question that explains what a good answer looks like."
        slotProps={{ htmlInput: { maxLength: 500 } }}
        fullWidth
      />
      {PLACEHOLDER_TYPES.includes(field.type) && (
        <TextField
          label="Placeholder"
          value={field.placeholder ?? ''}
          onChange={(event) => set({ placeholder: event.target.value || undefined })}
          disabled={disabled}
          helperText="Optional. Faint example text inside the empty box."
          slotProps={{ htmlInput: { maxLength: 120 } }}
          fullWidth
        />
      )}
    </>
  );
};

/**
 * Whether it must be answered. A consent question always must, so it asks for
 * the words being agreed to instead.
 */
const RequirementField = ({ field, set, showErrors, disabled }: PartProps): JSX.Element =>
  field.type === 'consent' ? (
    <TextField
      label="What people agree to"
      value={field.consentText ?? ''}
      onChange={(event) => set({ consentText: event.target.value || undefined })}
      disabled={disabled}
      multiline
      minRows={3}
      required
      error={showErrors && !field.consentText?.trim()}
      helperText="Applicants must tick this before they can submit, so a consent question is always required."
      slotProps={{ htmlInput: { maxLength: 1000 } }}
      fullWidth
    />
  ) : (
    <FormControlLabel
      control={
        <Switch
          checked={field.required}
          onChange={(_event, required) => set({ required })}
          disabled={disabled}
        />
      }
      label="Applicants must answer this"
    />
  );

/** Lowest and highest: characters for text, values for numbers, picks for multiple choice. */
const LimitFields = ({
  field,
  setValidation,
  disabled,
}: {
  field: FormField;
  setValidation: (patch: Partial<FieldValidation>) => void;
  disabled: boolean;
}): JSX.Element | null => {
  const limits = LIMITS[field.type];
  if (!limits) return null;
  // A number question's range may sit below zero (a temperature, a change);
  // lengths and counts cannot.
  const floor = field.type === 'number' ? undefined : 0;
  return (
    <Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <NumberInput
          label={limits.minLabel}
          value={field.validation?.[limits.min] as number | undefined}
          onChange={(value) => setValidation({ [limits.min]: value })}
          min={floor}
          disabled={disabled}
        />
        <NumberInput
          label={limits.maxLabel}
          value={field.validation?.[limits.max] as number | undefined}
          onChange={(value) => setValidation({ [limits.max]: value })}
          min={floor}
          disabled={disabled}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        {limits.helper}
      </Typography>
    </Box>
  );
};

/** "Use as the applicant's name, email or phone", offered only where the type fits. */
const MappingField = ({ field, set, disabled }: PartProps): JSX.Element | null => {
  const mappings = MAPPINGS_FOR[field.type] ?? [];
  if (mappings.length === 0) return null;
  return (
    <OptionSelect
      label="Use as the applicant's…"
      options={[
        NO_MAPPING,
        ...APPLICANT_MAPPING_OPTIONS.filter((option) =>
          mappings.includes(option.value as ApplicantMapping),
        ),
      ]}
      value={field.mapsTo ?? ''}
      onChange={(value) => set({ mapsTo: value ? (value as ApplicantMapping) : null })}
      disabled={disabled}
      helperText="The applications list shows people by these details, and the acknowledgement goes to the email."
    />
  );
};

const ProblemList = ({ problems }: { problems: readonly string[] }): JSX.Element | null =>
  problems.length === 0 ? null : (
    <Alert severity="warning">
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Fix before publishing
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </Box>
    </Alert>
  );

export interface FieldEditorProps {
  field: FormField;
  onChange: (field: FormField) => void;
  /** Earlier questions, which a condition on this one may use. */
  earlierFields: readonly FormField[];
  /** Problems with this question from `formDefinitionProblems`. */
  problems?: readonly string[];
  /** Show "required" style errors, after an attempt to move on. */
  showErrors?: boolean;
  disabled?: boolean;
}

/**
 * Everything about one question: its wording, whether it must be answered,
 * its options and limits, which applicant detail it supplies, and when it is
 * shown. Only the settings that apply to the question's type are offered.
 */
export const FieldEditor = ({
  field,
  onChange,
  earlierFields,
  problems = [],
  showErrors = false,
  disabled = false,
}: FieldEditorProps): JSX.Element => {
  const set = (patch: Partial<FormField>): void => onChange({ ...field, ...patch });
  const setValidation = (patch: Partial<FieldValidation>): void =>
    set({ validation: cleanValidation({ ...field.validation, ...patch }) });
  const part = { field, set, showErrors, disabled };

  return (
    <Stack spacing={2.5}>
      <WordingFields {...part} />
      <RequirementField {...part} />
      {isChoiceFieldType(field.type) && (
        <OptionsInput
          field={field}
          onChange={onChange}
          disabled={disabled}
          showErrors={showErrors}
        />
      )}
      <LimitFields field={field} setValidation={setValidation} disabled={disabled} />
      {field.type === 'file' && (
        <FileSettings field={field} setValidation={setValidation} disabled={disabled} />
      )}
      <MappingField {...part} />
      <VisibilityRuleEditor
        value={field.visibility}
        onChange={(visibility) => set({ visibility })}
        candidates={earlierFields}
        subject="question"
        disabled={disabled}
      />
      <ProblemList problems={problems} />
    </Stack>
  );
};
