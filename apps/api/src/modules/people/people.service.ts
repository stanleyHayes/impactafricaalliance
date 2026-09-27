import type { Paginated, PeopleQuery, PersonSummary } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { ValidationError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import { UserRepository, type UserSummaryRow } from '../users/user.repository.js';

/** Anything a stored record might hold where a user id belongs. */
export type PersonIdLike = string | { toString(): string } | null | undefined;

const toSummary = (row: UserSummaryRow): PersonSummary => ({
  id: row._id.toString(),
  name: row.name,
  email: row.email,
  role: row.role,
});

// Unique, non-empty ids as strings, in first-seen order.
const normaliseIds = (ids: Iterable<PersonIdLike>): string[] => {
  const unique = new Set<string>();
  for (const id of ids) {
    const value = id?.toString().trim();
    if (value) {
      unique.add(value);
    }
  }
  return [...unique];
};

/**
 * The people directory (plan D3): who works here, as far as every work module
 * needs to know.
 *
 * `GET /api/admin/users` is for administrators and returns whole accounts;
 * editors need to pick an assignee or see who added a photo without seeing
 * anyone's permissions. Everything here speaks `PersonSummary`.
 */
@injectable()
export class PeopleService {
  constructor(@inject(UserRepository) private readonly users: UserRepository) {}

  /** A page of active colleagues for a picker, matched on name or email. */
  async search(query: PeopleQuery): Promise<Paginated<PersonSummary>> {
    const { items, total } = await this.users.findDirectory({
      q: query.q,
      ids: query.ids,
      page: query.page,
      pageSize: query.pageSize,
    });
    return paginate(items.map(toSummary), total, query.page, query.pageSize);
  }

  /**
   * Turn stored user ids into people, in one query, for building responses.
   *
   * Includes deactivated accounts by default, so the history of a record keeps
   * the names of the people who did the work after they leave. Pass
   * `activeOnly` for lists that should show only current colleagues, such as
   * a project's members. An id with no account behind it is simply absent
   * from the map; callers show that as `null`.
   */
  async summaries(
    ids: Iterable<PersonIdLike>,
    options: { activeOnly?: boolean } = {},
  ): Promise<Map<string, PersonSummary>> {
    const wanted = normaliseIds(ids);
    if (wanted.length === 0) {
      return new Map();
    }
    const rows = await this.users.findSummaries(wanted, options);
    return new Map(rows.map((row) => [row._id.toString(), toSummary(row)]));
  }

  /** One person, or null when there is no such account. */
  async summary(id: PersonIdLike): Promise<PersonSummary | null> {
    const key = id?.toString();
    if (!key) {
      return null;
    }
    return (await this.summaries([key])).get(key) ?? null;
  }

  /**
   * Refuse ids that are not active colleagues. Used before saving a lead,
   * members or assignees, because an id from a browser proves nothing: it may
   * belong to a deactivated account or to nobody at all (plan D16).
   *
   * `label` names the field in the message, such as "Assignees".
   */
  async assertActive(ids: Iterable<PersonIdLike>, label = 'People'): Promise<void> {
    const wanted = normaliseIds(ids);
    if (wanted.length === 0) {
      return;
    }
    const active = await this.users.findSummaries(wanted, { activeOnly: true });
    const found = new Set(active.map((row) => row._id.toString()));
    const missing = wanted.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new ValidationError(`${label} must be active members of the team`, missing);
    }
  }
}
