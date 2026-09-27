import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { AUDIT_VALUE_MAX_LENGTH, diffFields, MAX_AUDIT_CHANGES } from './audit-diff.js';

describe('diffFields', () => {
  it('lists each changed field with its old and new value', () => {
    expect(
      diffFields(
        { title: 'Digital skills hubs', status: 'draft' },
        { title: 'Digital skills hubs', status: 'active' },
        ['title', 'status'],
      ),
    ).toEqual([{ field: 'status', from: 'draft', to: 'active' }]);
  });

  it('skips fields the update does not set, as a PATCH leaves them alone', () => {
    expect(
      diffFields({ title: 'Old', summary: 'Kept' }, { title: 'New' }, ['title', 'summary']),
    ).toEqual([{ field: 'title', from: 'Old', to: 'New' }]);
  });

  it('records a cleared value as null', () => {
    expect(diffFields({ country: 'Ghana' }, { country: null }, ['country'])).toEqual([
      { field: 'country', from: 'Ghana', to: null },
    ]);
  });

  it('treats not set, null and an empty string as the same thing', () => {
    expect(diffFields({ code: undefined }, { code: '' }, ['code'])).toEqual([]);
    expect(diffFields({}, { country: null }, ['country'])).toEqual([]);
  });

  it('compares a stored Date with the ISO text of a request', () => {
    const stored = { dueDate: new Date('2026-10-05T12:00:00.000Z') };
    expect(diffFields(stored, { dueDate: '2026-10-05T12:00:00Z' }, ['dueDate'])).toEqual([]);
    expect(diffFields(stored, { dueDate: '2026-10-06T12:00:00.000Z' }, ['dueDate'])).toEqual([
      { field: 'dueDate', from: '2026-10-05T12:00:00.000Z', to: '2026-10-06T12:00:00.000Z' },
    ]);
  });

  it('compares stored ObjectIds with the hex text of a request', () => {
    const lead = new Types.ObjectId();
    const other = new Types.ObjectId();
    expect(diffFields({ leadId: lead }, { leadId: lead.toHexString() }, ['leadId'])).toEqual([]);
    expect(
      diffFields({ memberIds: [lead] }, { memberIds: [lead.toHexString(), other.toHexString()] }, [
        'memberIds',
      ]),
    ).toEqual([
      {
        field: 'memberIds',
        from: lead.toHexString(),
        to: `${lead.toHexString()}, ${other.toHexString()}`,
      },
    ]);
  });

  it('ignores key order and empty keys inside nested objects', () => {
    const stored = {
      milestones: [{ id: 'm1', title: 'Launch', status: 'planned', description: null }],
    };
    const sent = { milestones: [{ status: 'planned', title: 'Launch', id: 'm1' }] };
    expect(diffFields(stored, sent, ['milestones'])).toEqual([]);
  });

  it('shows structured values as JSON', () => {
    const [change] = diffFields(
      { progressOverride: null },
      { progressOverride: { value: 40, reason: 'Field visits' } },
      ['progressOverride'],
    );
    expect(change).toEqual({
      field: 'progressOverride',
      from: null,
      to: '{"reason":"Field visits","value":40}',
    });
  });

  it('cuts long values short for display but still compares them in full', () => {
    const long = 'a'.repeat(500);
    const [change] = diffFields({ description: long }, { description: `${long}b` }, [
      'description',
    ]);
    expect(change?.from).toHaveLength(AUDIT_VALUE_MAX_LENGTH);
    expect(change?.from?.endsWith('…')).toBe(true);
    expect(change?.to).toHaveLength(AUDIT_VALUE_MAX_LENGTH);
  });

  it('keeps at most the maximum number of changes', () => {
    const fields = Array.from({ length: MAX_AUDIT_CHANGES + 5 }, (_, index) => `f${index}`);
    const after = Object.fromEntries(fields.map((field) => [field, 'changed']));
    expect(diffFields({}, after, fields)).toHaveLength(MAX_AUDIT_CHANGES);
  });
});
