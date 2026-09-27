import {
  isChoiceFieldType,
  newStableId,
  type FormField,
  type FormFieldType,
  type FormOption,
  type FormStep,
  type VisibilityOperator,
} from '@iaa/shared';

/**
 * The pure parts of the form builder: new steps and questions, moving them,
 * and the option values behind a choice question. Kept out of the components
 * so the rules can be tested without rendering anything.
 */

/** Most questions on one step, as the shared schema allows. */
export const MAX_FIELDS_PER_STEP = 30;

/** Longest option value the shared schema accepts. */
const OPTION_VALUE_MAX = 60;
// Room left for a "-12" suffix when two labels make the same value.
const OPTION_BASE_MAX = OPTION_VALUE_MAX - 4;

/** A new, empty step. Its id is fixed from now on; answers are stored against ids. */
export const newStep = (position: number): FormStep => ({
  id: newStableId('step'),
  title: `Step ${position + 1}`,
  fields: [],
});

/**
 * A new question of one type, with an empty label for the editor to fill in.
 * Choice questions start with two options so the preview shows the idea.
 */
export const newField = (type: FormFieldType): FormField => ({
  id: newStableId(type),
  type,
  label: '',
  // A consent question always has to be agreed to; saying so keeps the
  // switch honest.
  required: type === 'consent',
  options: isChoiceFieldType(type)
    ? [
        { value: 'option-1', label: 'Option 1' },
        { value: 'option-2', label: 'Option 2' },
      ]
    : [],
});

/** A copy with its own id. Only one question may supply the applicant's details, so the copy does not. */
export const duplicateField = (field: FormField): FormField => ({
  // A deep copy, so editing the copy's options or conditions leaves the original alone.
  ...(JSON.parse(JSON.stringify(field)) as FormField),
  id: newStableId(field.type),
  label: field.label ? `${field.label} (copy)`.slice(0, 300) : '',
  mapsTo: null,
});

/** The list with one item moved from one position to another. */
export const moveItem = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
};

/**
 * A stored value made from an option's label, in the shape the shared schema
 * accepts (lowercase letters, digits, hyphens and underscores, starting with
 * a letter or digit), and unlike any value in `taken`.
 */
export const optionValueFor = (label: string, taken: ReadonlySet<string>): string => {
  const base =
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^[-_]+|[-_]+$/g, '')
      .slice(0, OPTION_BASE_MAX)
      .replace(/[-_]+$/, '') || 'option';
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
};

/** The options as the editor types them: one label per line. */
export const optionsText = (options: readonly FormOption[]): string =>
  options.map((option) => option.label).join('\n');

/**
 * Options from the lines typed, keeping each option's stored value when its
 * label changes, so answers already given still point at the right choice.
 *
 * - A line whose label is unchanged keeps its value, wherever it has moved.
 * - A changed line takes the value of the option that was at its position,
 *   if that option has not been claimed: editing a label in place.
 * - Anything else is new and gets a value made from its label.
 *
 * Blank lines are ignored, so pressing Enter to start a new option does not
 * create an empty one.
 */
export const syncOptions = (text: string, previous: readonly FormOption[]): FormOption[] => {
  const labels = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(0, 200));
  const unclaimed = new Set(previous.map((_option, index) => index));
  const claim = (index: number): string | undefined => {
    if (!unclaimed.has(index)) return undefined;
    unclaimed.delete(index);
    return previous[index]?.value;
  };

  const values: (string | undefined)[] = labels.map((label) => {
    const index = previous.findIndex(
      (option, position) => unclaimed.has(position) && option.label === label,
    );
    return index === -1 ? undefined : claim(index);
  });
  labels.forEach((_label, position) => {
    if (values[position] === undefined) {
      values[position] = claim(position);
    }
  });
  const taken = new Set(values.filter((value): value is string => Boolean(value)));
  return labels.map((label, position) => {
    const kept = values[position];
    if (kept) {
      return { value: kept, label };
    }
    const value = optionValueFor(label, taken);
    taken.add(value);
    return { value, label };
  });
};

// How each kind of question can be compared, mirroring how the shared
// `isRuleMet` compares: a file can only be there or not; a tick-box and a
// single choice are one value; text can also be searched.
const PRESENCE: VisibilityOperator[] = ['is-empty', 'is-not-empty'];
const EXACT: VisibilityOperator[] = ['equals', 'not-equals', ...PRESENCE];
const ALL: VisibilityOperator[] = ['equals', 'not-equals', 'includes', 'not-includes', ...PRESENCE];

const OPERATORS_BY_TYPE: Record<FormFieldType, VisibilityOperator[]> = {
  'short-text': ALL,
  'long-text': ALL,
  email: ALL,
  phone: ALL,
  url: ALL,
  date: EXACT,
  number: EXACT,
  select: EXACT,
  radio: EXACT,
  'multi-select': ALL,
  checkbox: EXACT,
  consent: EXACT,
  file: PRESENCE,
};

/** The comparisons that make sense for a question of this type. */
export const operatorsFor = (type: FormFieldType): VisibilityOperator[] => OPERATORS_BY_TYPE[type];

/** Whether a comparison needs a value to compare with. */
export const operatorNeedsValue = (operator: VisibilityOperator): boolean =>
  !PRESENCE.includes(operator);

// How the shared checks name a question or a step at the start of a sentence.
const questionName = (field: Pick<FormField, 'label' | 'id'>): string =>
  `"${field.label.trim() || field.id}"`;

/**
 * The problems from `formDefinitionProblems` that are about one question,
 * found by the name every such sentence starts with. Two questions with the
 * same label share their problems, which is itself worth fixing.
 */
export const problemsForField = (
  problems: readonly string[],
  field: Pick<FormField, 'label' | 'id'>,
): string[] => problems.filter((problem) => problem.startsWith(questionName(field)));

/** The problems about one step's own condition. */
export const problemsForStep = (
  problems: readonly string[],
  step: Pick<FormStep, 'title'>,
): string[] => problems.filter((problem) => problem.startsWith(`Step "${step.title}"`));

/** Every question before a given one, in form order: what a condition may use. */
export const questionsBefore = (
  steps: readonly FormStep[],
  stepIndex: number,
  fieldIndex: number,
): FormField[] => [
  ...steps.slice(0, stepIndex).flatMap((step) => step.fields),
  ...(steps[stepIndex]?.fields.slice(0, Math.max(0, fieldIndex)) ?? []),
];
