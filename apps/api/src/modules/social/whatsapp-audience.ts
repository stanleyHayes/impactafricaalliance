import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import { TokenCrypto } from '../../providers/social/token-crypto.js';
import { TOKENS } from '../../tokens.js';
import { SubmissionRepository } from '../submissions/submission.repository.js';

import { SocialAccountRepository } from './social-account.repository.js';

/**
 * Who may lawfully be messaged on WhatsApp, and the credentials to do it.
 *
 * Separate from the publication service because it answers a different
 * question. Publishing asks "did this reach the network"; this asks "is this
 * person allowed to hear from us", which is a consent question with a
 * different source of truth and different consequences for getting it wrong.
 */
@injectable()
export class WhatsappAudience {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(SubmissionRepository) private readonly subscribers: SubmissionRepository,
    @inject(SocialAccountRepository) private readonly accounts: SocialAccountRepository,
    @inject(TokenCrypto) private readonly crypto: TokenCrypto,
  ) {}

  /** Everyone who opted in to WhatsApp and has not since unsubscribed. */
  async recipients(): Promise<Array<{ phone: string; name?: string }>> {
    const subscribers = await this.subscribers.listWhatsappRecipients();
    return subscribers.flatMap((subscriber) =>
      subscriber.whatsappPhone
        ? [
            {
              phone: subscriber.whatsappPhone,
              ...(subscriber.name ? { name: subscriber.name } : {}),
            },
          ]
        : [],
    );
  }

  /** The approved template a broadcast has to be sent under. */
  get template(): { templateName?: string; templateLanguage: string } {
    const whatsapp = this.config.social.whatsapp;
    return {
      ...(whatsapp.templateName ? { templateName: whatsapp.templateName } : {}),
      templateLanguage: whatsapp.templateLanguage,
    };
  }

  /**
   * WhatsApp authenticates with a long-lived system token from configuration
   * rather than an OAuth handshake, so its connection row is derived rather
   * than created by someone clicking Connect. Keeping it in the same table
   * means the dashboard and the publication pipeline need no special case.
   */
  async syncConnection(): Promise<void> {
    const whatsapp = this.config.social.whatsapp;
    if (!whatsapp.accessToken || !whatsapp.phoneNumberId) {
      return;
    }
    await this.accounts.upsert('whatsapp', {
      accessToken: this.crypto.encrypt(whatsapp.accessToken),
      accountId: whatsapp.phoneNumberId,
      accountName: 'WhatsApp Business',
      scopes: ['whatsapp_business_messaging'],
      status: 'active',
    });
  }
}
