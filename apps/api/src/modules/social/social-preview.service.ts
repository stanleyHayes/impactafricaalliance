import {
  destinationRejection,
  formatForDestination,
  taggedLinkFor,
  toCampaignSlug,
  variantFor,
  type SocialDestination,
  type SocialSource,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TOKENS } from '../../tokens.js';

import { SocialCopywriter } from './social-copywriter.js';

export interface DestinationPreview {
  destination: SocialDestination;
  caption: string;
  /** Whether the assistant wrote this or the deterministic template did. */
  origin: 'ai' | 'template';
  campaign: string;
  linkUrl?: string;
  imageUrl?: string;
  /** Why this destination cannot accept the draft as it stands. */
  rejection?: string;
}

/**
 * Drafting the copy, separately from sending it.
 *
 * Preview needs a copywriter and nothing else; publishing needs credentials
 * and a queue and never needs a copywriter. Keeping them apart means neither
 * carries the other's dependencies.
 */
@injectable()
export class SocialPreviewService {
  private readonly copywriter: SocialCopywriter;

  constructor(
    @inject(TOKENS.Config) config: AppConfig,
    @inject(TOKENS.Logger) logger: AppLogger,
  ) {
    this.copywriter = new SocialCopywriter(config.anthropic.apiKey, logger);
  }

  /**
   * Draft copy for each destination, for the editor to review and change.
   *
   * Each destination gets its own tagged link and its own crop, because the
   * whole point is that a post should look like it was written for the network
   * it lands on.
   */
  async preview(
    destinations: readonly SocialDestination[],
    source: SocialSource,
    options: { useAi?: boolean; campaign?: string; imageUrl?: string } = {},
  ): Promise<DestinationPreview[]> {
    const campaign = options.campaign?.trim() || toCampaignSlug(source.title);

    return Promise.all(
      destinations.map(async (destination) => this.draft(destination, source, campaign, options)),
    );
  }

  private async draft(
    destination: SocialDestination,
    source: SocialSource,
    campaign: string,
    options: { useAi?: boolean; imageUrl?: string },
  ): Promise<DestinationPreview> {
    // Tagged before drafting, so the link the copy carries is the tagged one.
    const linkUrl = source.url ? taggedLinkFor(source.url, destination, campaign) : undefined;
    const perDestination: SocialSource = { ...source, ...(linkUrl ? { url: linkUrl } : {}) };

    const drafted =
      options.useAi && this.copywriter.available
        ? await this.copywriter.draft(destination, perDestination)
        : {
            caption: formatForDestination(destination, perDestination),
            origin: 'template' as const,
          };

    const imageUrl = options.imageUrl ? variantFor(options.imageUrl, destination) : undefined;
    const rejection = destinationRejection(destination, {
      caption: drafted.caption,
      ...(imageUrl ? { imageUrl } : {}),
    });

    return {
      destination,
      caption: drafted.caption,
      origin: drafted.origin,
      campaign,
      ...(linkUrl ? { linkUrl } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(rejection ? { rejection } : {}),
    };
  }
}
