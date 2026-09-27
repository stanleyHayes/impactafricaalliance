import type { TaskStatus } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';

/**
 * What every task event carries: which task, who did it, and when. `actorId`
 * always comes from the signed-in user on the request, never from a body.
 */
interface TaskEventBase {
  taskId: string;
  /** The human key, such as `IAA-42`, so a notification can name the task without a lookup. */
  taskKey: string;
  actorId: string;
  /** ISO time of the change, taken when it happened rather than when it is delivered. */
  at: string;
}

/** People newly put on a task, or taken off it. Only the change, never the whole list. */
export interface TaskAssignmentEvent extends TaskEventBase {
  type: 'task.assigned' | 'task.unassigned';
  assigneeIds: string[];
}

export interface TaskCommentedEvent extends TaskEventBase {
  type: 'task.commented';
  commentId: string;
}

/**
 * Colleagues mentioned in a comment (tokens such as `@[Name](<id>)`), checked
 * as active by the tasks service. On an edit, only those mentioned for the
 * first time.
 */
export interface TaskMentionedEvent extends TaskEventBase {
  type: 'task.mentioned';
  commentId: string;
  mentionedIds: string[];
}

/** A due date set, moved or cleared. Null on either side means "no date". */
export interface TaskDueChangedEvent extends TaskEventBase {
  type: 'task.due-changed';
  from: string | null;
  to: string | null;
}

export interface TaskStatusChangedEvent extends TaskEventBase {
  type: 'task.status-changed';
  from: TaskStatus;
  to: TaskStatus;
}

/** Everything the tasks module announces (plan D12). */
export type TaskEvent =
  | TaskAssignmentEvent
  | TaskCommentedEvent
  | TaskMentionedEvent
  | TaskDueChangedEvent
  | TaskStatusChangedEvent;

export type TaskEventType = TaskEvent['type'];

/** The event names, for a consumer that wants to check it handles every one. */
export const TASK_EVENT_TYPES = [
  'task.assigned',
  'task.unassigned',
  'task.commented',
  'task.mentioned',
  'task.due-changed',
  'task.status-changed',
] as const satisfies readonly TaskEventType[];

/**
 * Where the tasks service announces changes, injected as `TOKENS.TaskEvents`.
 *
 * Spec §5.4 asks for notifications to sit behind a boundary rather than be
 * wired into task writes: a task save must never wait on, or fail because of,
 * an email provider. The tasks service publishes here and moves on; what
 * happens next (in-app notifications, emails, due-date reminders) is a later
 * phase that swaps the implementation without touching the tasks module.
 *
 * Implementations must not throw. A failure to notify is logged by the
 * publisher, because the change it describes has already been saved.
 */
export interface TaskEventPublisher {
  publish(event: TaskEvent): Promise<void>;
}

/**
 * The V1 publisher: a debug log line and nothing else. The audit trail already
 * records who changed what, so this exists to hold the boundary in place until
 * notifications are built (plan §11).
 */
@injectable()
export class LoggingTaskEventPublisher implements TaskEventPublisher {
  constructor(@inject(TOKENS.Logger) private readonly logger: AppLogger) {}

  async publish(event: TaskEvent): Promise<void> {
    this.logger.debug({ taskEvent: event }, 'Task event');
  }
}

/**
 * Hand events to the publisher without waiting and without letting a failure
 * reach the caller.
 *
 * The change each event describes is already saved, so a publisher that
 * throws (in spite of the rule above), rejects or hangs must never fail or
 * slow the request. Failures are logged with the task they were about.
 */
export const announceTaskEvents = (
  publisher: TaskEventPublisher,
  logger: AppLogger,
  events: readonly TaskEvent[],
): void => {
  for (const event of events) {
    Promise.resolve()
      .then(() => publisher.publish(event))
      .catch((err: unknown) => {
        logger.error(
          { err, module: 'tasks', entityId: event.taskId, eventType: event.type },
          'Failed to publish task event',
        );
      });
  }
};
