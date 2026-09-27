import type { FormField, FormStep } from '@iaa/shared';
import { describe, expect, it } from 'vitest';

import {
  answerText,
  buildApplicationCsv,
  csvCell,
  exportFields,
  toCsv,
} from './application-export.js';

const field = (id: string, type: FormField['type'], extra: Partial<FormField> = {}): FormField => ({
  id,
  type,
  label: id,
  required: false,
  options: [],
  ...extra,
});

const step = (id: string, fields: FormField[]): FormStep => ({ id, title: id, fields });

describe('CSV cells', () => {
  it('leaves plain text alone', () => {
    expect(csvCell('Ama Mensah')).toBe('Ama Mensah');
    expect(csvCell('')).toBe('');
  });

  it('quotes commas, quotes and line breaks (RFC 4180)', () => {
    expect(csvCell('Accra, Ghana')).toBe('"Accra, Ghana"');
    expect(csvCell('She said "yes"')).toBe('"She said ""yes"""');
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
    expect(csvCell('one\r\ntwo')).toBe('"one\r\ntwo"');
  });

  it('turns anything a spreadsheet would run as a formula into text', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+233 20 123 4567')).toBe("'+233 20 123 4567");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\t=cmd')).toBe("'\t=cmd");
    expect(csvCell('\r=cmd')).toBe(`"'\r=cmd"`);
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
    // Only the start matters.
    expect(csvCell('a=b')).toBe('a=b');
  });

  it('joins rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd,e'],
      ]),
    ).toBe('a,b\r\nc,"d,e"');
  });
});

describe('answers as spreadsheet text', () => {
  const colour = field('colour', 'radio', {
    options: [
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Deep blue' },
    ],
  });

  it('shows choices by their label and joins several with semicolons', () => {
    expect(answerText(colour, 'blue')).toBe('Deep blue');
    expect(answerText({ ...colour, type: 'multi-select' }, ['red', 'blue'])).toBe('Red; Deep blue');
    expect(answerText(colour, 'gone')).toBe('gone');
  });

  it('shows ticks as Yes or No, numbers as numbers and files by name', () => {
    expect(answerText(field('ok', 'checkbox'), true)).toBe('Yes');
    expect(answerText(field('ok', 'checkbox'), false)).toBe('No');
    expect(answerText(field('n', 'number'), 12.5)).toBe('12.5');
    expect(
      answerText(field('cv', 'file'), [
        { publicId: 'a', url: 'https://res.cloudinary.com/x/a', name: 'cv.pdf' },
        { publicId: 'b', url: 'https://res.cloudinary.com/x/b', name: 'letter.docx' },
      ]),
    ).toBe('cv.pdf; letter.docx');
    expect(answerText(field('t', 'short-text'), 'Hello')).toBe('Hello');
    expect(answerText(field('t', 'short-text'), null)).toBe('');
    expect(answerText(undefined, undefined)).toBe('');
  });
});

describe('export columns', () => {
  it('uses the newest wording first and keeps questions only older versions asked', () => {
    const newest = [step('a', [field('name', 'short-text', { label: 'Your name' })])];
    const oldest = [
      step('a', [field('name', 'short-text', { label: 'Name' }), field('dropped', 'short-text')]),
    ];
    expect(exportFields([newest, oldest]).map((item) => item.label)).toEqual([
      'Your name',
      'dropped',
    ]);
  });

  it('builds the whole file with fixed columns first', () => {
    const fields = [field('name', 'short-text', { label: 'Name' }), field('ok', 'checkbox')];
    const csv = buildApplicationCsv(fields, [
      {
        reference: 'APP-ABCDEF',
        status: 'submitted',
        submittedAt: new Date('2026-10-01T10:00:00.000Z'),
        applicant: { name: '=evil', email: 'ama@example.org' },
        answers: [
          { fieldId: 'name', value: 'Ama, Mensah' },
          { fieldId: 'ok', value: false },
        ],
      },
    ]);
    expect(csv.split('\r\n')).toEqual([
      'Reference,Status,Submitted at,Applicant name,Applicant email,Applicant phone,Name,ok',
      `APP-ABCDEF,submitted,2026-10-01T10:00:00.000Z,'=evil,ama@example.org,,"Ama, Mensah",No`,
    ]);
  });
});
