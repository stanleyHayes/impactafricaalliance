import type { ProjectListQuery, ProjectSort } from '@iaa/shared';
import type { PipelineStage, Types } from 'mongoose';

import type { QueryFilter } from '../../common/mongo-types.js';
import { searchRegex } from '../../common/regex.js';

import { actorObjectId } from './project-changes.js';
import type { ProjectRecord } from './project.model.js';

/**
 * How the project list and its progress counts are asked of MongoDB. Pure,
 * so each filter and sort can be checked without a database.
 */

/**
 * The list's filter.
 *
 * - Archived projects are left out unless `includeArchived` or
 *   `status=archived` asks for them (plan D5).
 * - `mine` is led by or a member of the caller. A caller whose id is not an
 *   ObjectId leads nothing, so the filter matches nothing rather than
 *   everything.
 * - `q` is a literal, case-insensitive match on title, code or summary.
 */
export const projectListFilter = (
  query: Pick<
    ProjectListQuery,
    'q' | 'status' | 'priority' | 'programme' | 'mine' | 'includeArchived'
  >,
  actorId: string,
): QueryFilter<ProjectRecord> => {
  const and: QueryFilter<ProjectRecord>[] = [];
  if (query.status) {
    and.push({ status: query.status });
  } else if (!query.includeArchived) {
    and.push({ status: { $ne: 'archived' } });
  }
  if (query.priority) and.push({ priority: query.priority });
  if (query.programme) and.push({ programme: query.programme });
  if (query.q) {
    const pattern = searchRegex(query.q);
    and.push({ $or: [{ title: pattern }, { code: pattern }, { summary: pattern }] });
  }
  if (query.mine) {
    const me = actorObjectId(actorId);
    and.push(me ? { $or: [{ leadId: me }, { memberIds: me }] } : { _id: { $exists: false } });
  }
  if (and.length === 0) return {};
  return and.length === 1 ? (and[0] as QueryFilter<ProjectRecord>) : { $and: and };
};

/**
 * Only what a list row needs. Milestone statuses and the override are kept
 * because progress is worked out from them; long text, evidence and plans
 * are not sent.
 */
export const LIST_PROJECTION = {
  title: 1,
  slug: 1,
  code: 1,
  summary: 1,
  status: 1,
  priority: 1,
  programme: 1,
  leadId: 1,
  memberIds: 1,
  startDate: 1,
  endDate: 1,
  country: 1,
  tags: 1,
  cover: 1,
  'milestones.status': 1,
  progressOverride: 1,
  archivedAt: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

// Undated projects go to the end of a date sort: "starting soonest" should
// not open with every project nobody has scheduled yet.
const datedFirst = (field: 'startDate' | 'endDate'): PipelineStage[] => [
  { $addFields: { undated: { $cond: [{ $eq: [{ $type: `$${field}` }, 'date'] }, 0, 1] } } },
  { $sort: { undated: 1, [field]: 1, _id: 1 } },
];

const SORT_STAGES: Record<ProjectSort, PipelineStage[]> = {
  updated: [{ $sort: { updatedAt: -1, _id: -1 } }],
  start: datedFirst('startDate'),
  end: datedFirst('endDate'),
  title: [{ $sort: { title: 1, _id: 1 } }],
};

/**
 * One page of the list. Title sorting also needs the case-insensitive
 * collation the caller sets on the aggregate (see `LIST_COLLATION`).
 */
export const projectListPipeline = (
  filter: QueryFilter<ProjectRecord>,
  sort: ProjectSort,
  page: number,
  pageSize: number,
): PipelineStage[] => [
  { $match: filter },
  { $project: LIST_PROJECTION },
  ...SORT_STAGES[sort],
  { $skip: (page - 1) * pageSize },
  { $limit: pageSize },
  { $project: { undated: 0 } },
];

/** English, ignoring case and accents, so "ghana" sorts beside "Ghana". */
export const LIST_COLLATION = { locale: 'en', strength: 1 } as const;

/**
 * The first instant of a UTC calendar day. A task is overdue exactly when its
 * due date falls before this, which is `dueBucket(due, today) === 'overdue'`
 * written as a comparison MongoDB can run.
 */
export const startOfUtcDay = (dayKey: string): Date => new Date(`${dayKey}T00:00:00.000Z`);

/** One row per project from `taskCountsPipeline`. */
export interface TaskCountRow {
  _id: Types.ObjectId;
  total: number;
  done: number;
  overdue: number;
}

/**
 * Task counts for many projects in one aggregate, so a page of twenty
 * projects costs one query rather than twenty. Archived tasks are not
 * counted; overdue means not done and due before `today` (a UTC day key).
 */
export const taskCountsPipeline = (
  projectIds: Types.ObjectId[],
  today: string,
): PipelineStage[] => {
  const isDone = { $eq: ['$status', 'done'] };
  return [
    // `archivedAt: null` also matches tasks that never had the field.
    { $match: { projectId: { $in: projectIds }, archivedAt: null } },
    {
      $group: {
        _id: '$projectId',
        total: { $sum: 1 },
        done: { $sum: { $cond: [isDone, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $not: [isDone] },
                  // A missing date would otherwise compare as less than any date.
                  { $eq: [{ $type: '$dueDate' }, 'date'] },
                  { $lt: ['$dueDate', startOfUtcDay(today)] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ];
};
