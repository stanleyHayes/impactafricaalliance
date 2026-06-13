import type { Paginated, SubmissionInput, SubmissionStatus, SubscribeInput } from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import { TOKENS } from '../../tokens.js';

import type { SubmissionDocument, SubscriberDocument } from './submission.model.js';
import { SubmissionRepository, type SubmissionListFilter } from './submission.repository.js';

const escapeHtml = (value: unknown): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

@injectable()
export class SubmissionService {
  constructor(
    @inject(SubmissionRepository) private readonly repo: SubmissionRepository,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async submit(input: SubmissionInput): Promise<{ id: string }> {
    const { type, ...payload } = input;
    const created = await this.repo.createSubmission(type, payload);
    await this.notify(type, payload);
    return { id: created.id };
  }

  async subscribe(input: SubscribeInput): Promise<{ subscribed: true }> {
    const existing = await this.repo.findSubscriberByEmail(input.email);
    if (existing) {
      if (existing.unsubscribedAt) {
        await this.repo.reactivateSubscriber(existing.id);
      }
      return { subscribed: true };
    }
    await this.repo.createSubscriber(input);
    return { subscribed: true };
  }

  async list(
    filter: SubmissionListFilter,
    page: number,
    pageSize: number,
  ): Promise<Paginated<SubmissionDocument>> {
    const { items, total } = await this.repo.listSubmissions(filter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  async setStatus(id: string, status: SubmissionStatus): Promise<SubmissionDocument> {
    const updated = await this.repo.updateStatus(id, status);
    if (!updated) {
      throw new NotFoundError('Submission');
    }
    return updated;
  }

  async listSubscribers(page: number, pageSize: number): Promise<Paginated<SubscriberDocument>> {
    const { items, total } = await this.repo.listSubscribers(page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  /** Best-effort admin notification — never blocks the user's submission. */
  private async notify(type: string, payload: Record<string, unknown>): Promise<void> {
    const rows = Object.entries(payload)
      .map(
        ([key, value]) =>
          `<tr><td><strong>${escapeHtml(key)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
      )
      .join('');
    const replyTo = typeof payload.email === 'string' ? payload.email : undefined;
    try {
      await this.email.send({
        to: this.config.email.notifyTo,
        subject: `New ${type} submission — IAA website`,
        html: `<h2>New ${escapeHtml(type)} submission</h2><table>${rows}</table>`,
        ...(replyTo ? { replyTo } : {}),
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to send submission notification');
    }
  }
}
