import {
  isChoiceFieldType,
  type AnswerValue,
  type ApplicantIdentity,
  type ApplicationStatus,
  type FileAnswer,
  type FormField,
  type FormStep,
} from '@iaa/shared';

/**
 * The applications CSV (plan §3.4): one row per submitted application, one
 * column per question.
 *
 * Opened in Excel or Google Sheets by people who trust it, so every cell is
 * guarded against formula injection: an applicant who types `=HYPERLINK(…)`
 * as their name must not get a live formula into a colleague's spreadsheet.
 */

/** One submitted application, as the export needs it. */
export interface ExportRow {
  reference?: string;
  status: ApplicationStatus;
  submittedAt?: Date | null;
  applicant?: ApplicantIdentity;
  answers: readonly { fieldId: string; value: AnswerValue }[];
}

// Cells a spreadsheet would read as a formula, or as the start of one.
const FORMULA_START = /^[=+\-@\t\r]/;
// Cells that must be quoted to stay one cell (RFC 4180).
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * One cell, safe to open: a leading quote turns a would-be formula into text,
 * and quoting keeps commas, quotes and line breaks inside the cell.
 */
export const csvCell = (text: string): string => {
  const guarded = FORMULA_START.test(text) ? `'${text}` : text;
  return NEEDS_QUOTES.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

/** Rows as CSV text, with the CRLF line endings RFC 4180 asks for. */
export const toCsv = (rows: readonly (readonly string[])[]): string =>
  rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

/**
 * Every question that any version of the form has asked, newest wording
 * first. `definitions` runs newest to oldest; a question removed in a later
 * version still gets a column at the end, so an older application's answer to
 * it is not lost from the export.
 */
export const exportFields = (definitions: readonly (readonly FormStep[])[]): FormField[] => {
  const seen = new Map<string, FormField>();
  for (const steps of definitions) {
    for (const field of steps.flatMap((step) => step.fields)) {
      if (!seen.has(field.id)) {
        seen.set(field.id, field);
      }
    }
  }
  return [...seen.values()];
};

const optionLabel = (field: FormField | undefined, value: string): string =>
  field?.options.find((option) => option.value === value)?.label ?? value;

const isFileList = (value: readonly unknown[]): value is FileAnswer[] =>
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

/**
 * An answer as text a person reads in a spreadsheet: choices by their label,
 * several choices or files separated by semicolons, files by their name, and
 * ticks as Yes or No.
 */
export const answerText = (
  field: FormField | undefined,
  value: AnswerValue | undefined,
): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return field && isChoiceFieldType(field.type) ? optionLabel(field, value) : value;
  }
  if (isFileList(value)) {
    return value.map((file) => file.name).join('; ');
  }
  return value.map((item) => optionLabel(field, String(item))).join('; ');
};

const FIXED_HEADINGS = [
  'Reference',
  'Status',
  'Submitted at',
  'Applicant name',
  'Applicant email',
  'Applicant phone',
];

/** The whole CSV for one form's applications. */
export const buildApplicationCsv = (
  fields: readonly FormField[],
  rows: readonly ExportRow[],
): string => {
  const header = [...FIXED_HEADINGS, ...fields.map((field) => field.label)];
  const body = rows.map((row) => {
    const answers = new Map(row.answers.map((answer) => [answer.fieldId, answer.value]));
    return [
      row.reference ?? '',
      row.status,
      row.submittedAt ? row.submittedAt.toISOString() : '',
      row.applicant?.name ?? '',
      row.applicant?.email ?? '',
      row.applicant?.phone ?? '',
      ...fields.map((field) => answerText(field, answers.get(field.id))),
    ];
  });
  return toCsv([header, ...body]);
};
