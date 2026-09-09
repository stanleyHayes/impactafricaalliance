import { submissionSchema } from '@iaa/shared';
import {
  CONSENT_VERSION,
  type Paginated,
  type SubmissionInput,
  type SubmissionStatus,
  type SubscribeInput,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import { parseWith } from '../../common/validate.js';
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
    const { type, consent, consentVersion, ...payload } = input;
    const created = await this.repo.createSubmission({
      type,
      payload,
      consent,
      consentVersion: consentVersion ?? CONSENT_VERSION,
      consentedAt: new Date(),
    });
    await this.notify(type, payload);
    return { id: created.id };
  }

  async subscribe(input: SubscribeInput): Promise<{ subscribed: true }> {
    const { consent, consentVersion, ...rest } = input;
    const now = new Date();
    const existing = await this.repo.findSubscriberByEmail(input.email);
    if (existing) {
      if (existing.unsubscribedAt) {
        await this.repo.reactivateSubscriber(existing.id, consentVersion ?? CONSENT_VERSION, now);
      }
      // Somebody who already subscribes by email can add WhatsApp later, and
      // that is a new consent in its own right — dated when it was given.
      if (rest.whatsappOptIn && rest.whatsappPhone && !existing.whatsappOptIn) {
        await this.repo.setWhatsappOptIn(existing.id, rest.whatsappPhone, now);
      }
      return { subscribed: true };
    }
    await this.repo.createSubscriber({
      ...rest,
      consent,
      consentVersion: consentVersion ?? CONSENT_VERSION,
      consentedAt: now,
      ...(rest.whatsappOptIn && rest.whatsappPhone ? { whatsappOptInAt: now } : {}),
    });
    return { subscribed: true };
  }

  async unsubscribe(email: string): Promise<{ unsubscribed: boolean }> {
    const subscriber = await this.repo.unsubscribeSubscriber(email);
    return { unsubscribed: Boolean(subscriber) };
  }

  async deleteSubscriber(id: string): Promise<void> {
    const deleted = await this.repo.deleteSubscriber(id);
    if (!deleted) {
      throw new NotFoundError('Subscriber');
    }
  }

  async list(
    filter: SubmissionListFilter,
    page: number,
    pageSize: number,
  ): Promise<Paginated<SubmissionDocument>> {
    const { items, total } = await this.repo.listSubmissions(filter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  async get(id: string): Promise<SubmissionDocument> {
    const item = await this.repo.findSubmission(id);
    if (!item) throw new NotFoundError('Submission');
    return item;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repo.deleteSubmission(id))) throw new NotFoundError('Submission');
  }

  async update(
    id: string,
    input: { status: SubmissionStatus; payload?: Record<string, unknown> },
  ): Promise<SubmissionDocument> {
    const existing = await this.get(id);
    let payload: Record<string, unknown> | undefined;
    if (input.payload) {
      const validated = parseWith(submissionSchema, {
        ...input.payload,
        type: existing.type,
        consent: true,
      });
      const fields = Object.fromEntries(
        Object.entries(validated).filter(
          ([key]) => !['type', 'consent', 'consentVersion'].includes(key),
        ),
      );
      payload = { ...existing.payload, ...fields };
      // Clearing the optional numeric field must not coerce an empty input to zero.
      if (existing.type === 'volunteer' && !('availabilityHoursPerMonth' in fields))
        delete payload.availabilityHoursPerMonth;
    }
    const updated = await this.repo.updateSubmission(id, {
      status: input.status,
      ...(payload ? { payload } : {}),
    });
    if (!updated) throw new NotFoundError('Submission');
    return updated;
  }

  async updateSubscriber(
    id: string,
    input: { name: string; source: string },
  ): Promise<SubscriberDocument> {
    const item = await this.repo.updateSubscriber(id, input);
    if (!item) throw new NotFoundError('Subscriber');
    return item;
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
