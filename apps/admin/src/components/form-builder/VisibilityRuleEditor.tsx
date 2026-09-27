import {
  isChoiceFieldType,
  type FormField,
  type VisibilityCondition,
  type VisibilityOperator,
  type VisibilityRule,
} from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { FORM_FIELD_TYPE_OPTIONS, VISIBILITY_OPERATOR_OPTIONS } from '../../lib/select-options';
import { OptionSelect, type SelectChoice } from '../fields/OptionSelect';

import { operatorNeedsValue, operatorsFor } from './builder-model';

/** Most conditions one question or step may have, as the shared schema allows. */
const MAX_RULES = 10;

const MATCH_OPTIONS: SelectChoice[] = [
  {
    value: 'all',
    label: 'All of these are true',
    description: 'Shown only when every condition below holds.',
  },
  {
    value: 'any',
    label: 'Any one of these is true',
    description: 'Shown as soon as one condition below holds.',
  },
];

const TICK_OPTIONS: SelectChoice[] = [
  { value: 'true', label: 'Ticked', description: 'The box was ticked.' },
  { value: 'false', label: 'Not ticked', description: 'The box was left empty.' },
];

const typeIcon = (field: FormField) =>
  FORM_FIELD_TYPE_OPTIONS.find((option) => option.value === field.type)?.icon;

const questionLabel = (field: FormField): string => field.label.trim() || 'Untitled question';

/** A sensible first condition on a question: its first comparison and first option. */
const ruleFor = (field: FormField): VisibilityRule => {
  const operator = operatorsFor(field.type)[0] ?? 'is-not-empty';
  if (!operatorNeedsValue(operator)) return { fieldId: field.id, operator };
  if (isChoiceFieldType(field.type)) {
    return { fieldId: field.id, operator, value: field.options[0]?.value ?? '' };
  }
  if (field.type === 'checkbox' || field.type === 'consent') {
    return { fieldId: field.id, operator, value: 'true' };
  }
  return { fieldId: field.id, operator, value: '' };
};

/** The value box for one condition, shaped by the question it looks at. */
const RuleValue = ({
  field,
  rule,
  onChange,
  disabled,
}: {
  field: FormField;
  rule: VisibilityRule;
  onChange: (value: string) => void;
  disabled?: boolean;
}): JSX.Element | null => {
  if (!operatorNeedsValue(rule.operator)) return null;
  if (isChoiceFieldType(field.type)) {
    return (
      <OptionSelect
        label="Answer"
        options={field.options.map((option) => ({ value: option.value, label: option.label }))}
        value={rule.value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder="Choose an answer"
      />
    );
  }
  if (field.type === 'checkbox' || field.type === 'consent') {
    return (
      <OptionSelect
        label="Answer"
        options={TICK_OPTIONS}
        value={rule.value ?? ''}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return (
    <TextField
      label="Answer"
      value={rule.value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      fullWidth
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
      slotProps={{ htmlInput: { maxLength: 200 } }}
    />
  );
};

export interface VisibilityRuleEditorProps {
  value: VisibilityCondition | null | undefined;
  /** Null switches the condition off: always shown. */
  onChange: (value: VisibilityCondition | null) => void;
  /** Questions that come before this one or this step: the only ones a condition may use. */
  candidates: readonly FormField[];
  /** What is being shown or hidden, for the wording. */
  subject: 'question' | 'step';
  disabled?: boolean;
}

/** Whether a condition's value survives a new comparison: kept when one is still needed. */
const withOperator = (rule: VisibilityRule, operator: VisibilityOperator): VisibilityRule => {
  const { value: previousValue, ...rest } = rule;
  return operatorNeedsValue(operator)
    ? { ...rest, operator, value: previousValue ?? '' }
    : { ...rest, operator };
};

/** One condition: which earlier question, how it is compared, and with what. */
const RuleRow = ({
  rule,
  index,
  field,
  questionOptions,
  onChange,
  onRemove,
  disabled,
}: {
  rule: VisibilityRule;
  index: number;
  /** The question the rule looks at, or undefined when it is no longer earlier. */
  field: FormField | undefined;
  questionOptions: SelectChoice[];
  onChange: (rule: VisibilityRule) => void;
  onRemove: () => void;
  disabled: boolean;
}): JSX.Element => {
  const operators = field ? operatorsFor(field.type) : [];
  return (
    <Box
      role="group"
      aria-label={`Condition ${index + 1}`}
      sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' },
        }}
      >
        <OptionSelect
          label="Question"
          options={questionOptions}
          value={field ? rule.fieldId : ''}
          onChange={(fieldId) => {
            const next = questionOptions.find((option) => option.value === fieldId);
            if (next) onChange({ ...rule, fieldId });
          }}
          disabled={disabled}
          placeholder="Choose an earlier question"
          error={field ? undefined : 'That question is no longer before this one.'}
        />
        <OptionSelect
          label="Is compared by"
          options={VISIBILITY_OPERATOR_OPTIONS.filter((option) =>
            operators.includes(option.value as VisibilityOperator),
          )}
          value={field ? rule.operator : ''}
          onChange={(operator) => onChange(withOperator(rule, operator as VisibilityOperator))}
          disabled={disabled || !field}
        />
        {field && (
          <RuleValue
            field={field}
            rule={rule}
            onChange={(next) => onChange({ ...rule, value: next })}
            disabled={disabled}
          />
        )}
      </Box>
      <IconButton
        aria-label={`Remove condition ${index + 1}`}
        onClick={onRemove}
        disabled={disabled}
        sx={{ mt: 1 }}
      >
        <CloseRoundedIcon />
      </IconButton>
    </Box>
  );
};

/**
 * "Only show this when…": the conditions on one question or step.
 *
 * A condition may only look at an earlier question, because the applicant
 * answers in order; the picker offers nothing else. Each comparison offered
 * suits the question it looks at, and a choice question's answer is picked
 * from its own options, so a condition that can never be met is hard to make.
 */
export const VisibilityRuleEditor = ({
  value,
  onChange,
  candidates,
  subject,
  disabled = false,
}: VisibilityRuleEditorProps): JSX.Element => {
  const rules = value?.rules ?? [];
  const enabled = rules.length > 0;
  const byId = new Map(candidates.map((field) => [field.id, field]));
  const questionOptions: SelectChoice[] = candidates.map((field) => ({
    value: field.id,
    label: questionLabel(field),
    icon: typeIcon(field),
  }));
  const lastCandidate = candidates[candidates.length - 1];

  if (!lastCandidate && !enabled) {
    return (
      <Typography variant="body2" color="text.secondary">
        This {subject} is always shown. A condition can only use questions that come before it, and
        there are none yet.
      </Typography>
    );
  }

  const match = value?.match ?? 'all';
  const update = (next: VisibilityRule[]): void =>
    onChange(next.length > 0 ? { match, rules: next } : null);
  // A new question for a rule starts it afresh: its old comparison and value
  // may make no sense for the new question.
  const changeRule = (index: number, next: VisibilityRule): void => {
    const current = rules[index];
    const field = byId.get(next.fieldId);
    const replacement =
      current && field && current.fieldId !== next.fieldId ? ruleFor(field) : next;
    update(rules.map((rule, position) => (position === index ? replacement : rule)));
  };

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={disabled}
            onChange={(_event, checked) => {
              if (!checked) onChange(null);
              else if (lastCandidate) onChange({ match: 'all', rules: [ruleFor(lastCandidate)] });
            }}
          />
        }
        label={`Only show this ${subject} when…`}
      />
      {enabled && (
        <Stack
          spacing={2}
          sx={{ pl: { xs: 0, sm: 2 }, borderLeft: { sm: 2 }, borderColor: { sm: 'divider' } }}
        >
          {rules.length > 1 && (
            <OptionSelect
              label="Show it when"
              options={MATCH_OPTIONS}
              value={match}
              onChange={(next) => onChange({ match: next === 'any' ? 'any' : 'all', rules })}
              disabled={disabled}
            />
          )}
          {rules.map((rule, index) => (
            <RuleRow
              key={`${rule.fieldId}-${index}`}
              rule={rule}
              index={index}
              field={byId.get(rule.fieldId)}
              questionOptions={questionOptions}
              onChange={(next) => changeRule(index, next)}
              onRemove={() => update(rules.filter((_rule, position) => position !== index))}
              disabled={disabled}
            />
          ))}
          {lastCandidate ? (
            <Box>
              <Button
                startIcon={<AddRoundedIcon />}
                onClick={() => update([...rules, ruleFor(lastCandidate)])}
                disabled={disabled || rules.length >= MAX_RULES}
              >
                Add another condition
              </Button>
            </Box>
          ) : (
            <Alert severity="warning">
              There are no questions before this {subject} any more. Remove the condition, or move
              the {subject} after the question it depends on.
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
};
