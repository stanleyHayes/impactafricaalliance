import type { Resend } from 'resend';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../config/logger.js';
import { TOKENS } from '../tokens.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/** Abstraction over transactional email so the app never couples to a vendor. */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Resend-backed email provider. When no API key is configured (local dev/test)
 * it logs the message instead of sending, so flows remain testable offline.
 */
@injectable()
export class ResendEmailProvider implements EmailProvider {
  private client?: Resend;

  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      this.logger.warn(
        { to: message.to, subject: message.subject },
        'Email skipped (no RESEND_API_KEY)',
      );
      return;
    }
    const { error } = await client.emails.send({
      from: this.config.email.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    if (error) {
      this.logger.error({ err: error }, 'Failed to send email');
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  private async getClient(): Promise<Resend | undefined> {
    if (!this.config.email.apiKey) {
      return undefined;
    }
    if (!this.client) {
      const { Resend } = await import('resend');
      this.client = new Resend(this.config.email.apiKey);
    }
    return this.client;
  }
}
