import { AUDIT_MODULES, type AuditChange, type AuditModule } from '@iaa/shared';
import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

import { baseSchemaOptions } from '../../common/model-helpers.js';
import { userRef } from '../../common/work-model-helpers.js';

/**
 * One line of a record's activity log (plan D4). Written by `AuditService`,
 * never edited, and read back through each module's own `/:id/activity`
 * endpoint so seeing the log needs the same permission as seeing the record.
 */
export interface AuditEventDocument {
  module: AuditModule;
  /** What kind of record, such as `project` or `task`, since one module can hold several. */
  entityType: string;
  /** The record's id, kept as text so any kind of record can be logged. */
  entityId: string;
  /** One of `AUDIT_ACTIONS`. */
  action: string;
  actorId?: Types.ObjectId | null;
  /** The actor's email at the time, which outlives the account. */
  actorEmail?: string;
  summary: string;
  changes: AuditChange[];
  at: Date;
}

export type AuditEventHydrated = HydratedDocument<AuditEventDocument>;

const changeSubSchema = new Schema<AuditChange>(
  {
    field: { type: String, required: true },
    from: { type: String, default: undefined },
    to: { type: String, default: undefined },
  },
  { _id: false },
);

const auditEventSchema = new Schema<AuditEventDocument>(
  {
    module: { type: String, enum: AUDIT_MODULES, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    actorId: userRef(),
    actorEmail: { type: String, lowercase: true, trim: true },
    summary: { type: String, required: true },
    changes: { type: [changeSubSchema], default: [] },
    at: { type: Date, required: true, default: Date.now },
  },
  // `at` is the one time that matters, and nothing is ever updated, so the
  // createdAt/updatedAt pair would only be two more copies of it.
  { ...baseSchemaOptions, timestamps: false, collection: 'auditevents' },
);

// A record's activity tab, newest first.
auditEventSchema.index({ entityType: 1, entityId: 1, at: -1 });
// A module's recent activity across all its records, newest first.
auditEventSchema.index({ module: 1, at: -1 });

export const AuditEventModel = model<AuditEventDocument>('AuditEvent', auditEventSchema);
