import type {
  AuditAction,
  AuditChange,
  AuditEvent,
  AuditModule,
  Paginated,
  PersonSummary,
} from '@iaa/shared';
import { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { paginate } from '../../common/pagination.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';
import { PeopleService } from '../people/people.service.js';

import { MAX_AUDIT_CHANGES } from './audit-diff.js';
import { AuditEventModel, type AuditEventDocument } from './audit.model.js';

/** What a service reports after a change it has already saved. */
export interface AuditRecordInput {
  module: AuditModule;
  /** The kind of record, such as `project`, `task` or `application`. */
  entityType: string;
  entityId: string | Types.ObjectId;
  action: AuditAction;
  /** Always `req.user.sub` from the route, never a value from the request body. */
  actorId?: string;
  /** Always `req.user.email` from the route. */
  actorEmail?: string;
  /** One line a person can read, such as "Moved to In review". */
  summary: string;
  /** From `diffFields`. */
  changes?: AuditChange[];
}

// A summary is one line in a timeline; anything longer is a mistake upstream.
const MAX_SUMMARY_LENGTH = 500;

// Stricter than `Types.ObjectId.isValid`, which also accepts any 12-character string.
const OBJECT_ID = /^[a-f\d]{24}$/i;

type StoredAuditEvent = AuditEventDocument & { _id: Types.ObjectId };

const toDto = (
  event: StoredAuditEvent,
  people: ReadonlyMap<string, PersonSummary>,
): AuditEvent => ({
  id: event._id.toString(),
  module: event.module,
  entityType: event.entityType,
  entityId: event.entityId,
  action: event.action,
  actor: event.actorId ? (people.get(event.actorId.toString()) ?? null) : null,
  ...(event.actorEmail ? { actorEmail: event.actorEmail } : {}),
  summary: event.summary,
  ...(event.changes?.length ? { changes: event.changes } : {}),
  at: event.at.toISOString(),
});

/**
 * The audit trail (plan D4, spec §13 Auditability).
 *
 * Services call `record` after a change is saved. Recording is best-effort by
 * design: the change has already happened, so failing the request because
 * the log could not be written would tell the user it did not, which is
 * worse than a gap in the log. Failures are logged loudly instead.
 */
@injectable()
export class AuditService {
  constructor(
    @inject(PeopleService) private readonly people: PeopleService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** Write one entry. Never throws. */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      await AuditEventModel.create({
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId.toString(),
        action: input.action,
        // An id that is not an ObjectId cannot name an account; the email
        // still says who it was.
        actorId:
          input.actorId && OBJECT_ID.test(input.actorId)
            ? new Types.ObjectId(input.actorId)
            : undefined,
        actorEmail: input.actorEmail,
        summary: input.summary.slice(0, MAX_SUMMARY_LENGTH),
        changes: (input.changes ?? []).slice(0, MAX_AUDIT_CHANGES),
        at: new Date(),
      });
    } catch (err) {
      this.logger.error(
        {
          err,
          module: input.module,
          entityType: input.entityType,
          entityId: String(input.entityId),
          action: input.action,
        },
        'Failed to record audit event',
      );
    }
  }

  /**
   * One record's activity, newest first, with each actor resolved to their
   * current name. The caller has already checked the reader may see the
   * record.
   */
  async list(
    entityType: string,
    entityId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<AuditEvent>> {
    const filter = { entityType, entityId };
    const [events, total] = await Promise.all([
      AuditEventModel.find(filter)
        .sort({ at: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<StoredAuditEvent[]>()
        .exec(),
      AuditEventModel.countDocuments(filter).exec(),
    ]);
    const people = await this.people.summaries(events.map((event) => event.actorId));
    return paginate(
      events.map((event) => toDto(event, people)),
      total,
      page,
      pageSize,
    );
  }
}
