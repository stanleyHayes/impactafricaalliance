import {
  DESTINATION_CAPABILITIES,
  formatForDestination,
  truncate,
  type SocialDestination,
  type SocialSource,
} from '@iaa/shared';

import type { AppLogger } from '../../config/logger.js';
import { AiAssistService } from '../ai/ai.service.js';

/**
 * Optional AI polish on top of the deterministic drafts.
 *
 * The templates are what publishing actually depends on. This only ever
 * improves on one, and any failure — no key, a refusal, a timeout, an answer
 * that came back too long — returns the template instead. Publishing must not
 * become unavailable because a model is.
 */

/** How each network is written, in the terms a copywriter would use. */
const VOICE: Record<SocialDestination, string> = {
  facebook:
    'Warm and direct, for a general audience. Two or three short paragraphs, ending with the link.',
  linkedin:
    'Professional and specific. Lead with why it matters, two to four short paragraphs, no hashtags.',
  instagram:
    'Vivid and human, written for a caption under a photograph. Keep the hashtags that are already there. Do not tell people to follow a link — a caption link is not clickable.',
  x: 'One sharp sentence that earns the click. Keep the link exactly as it appears.',
  threads: 'Conversational, like talking to a colleague. One short paragraph.',
};

export class SocialCopywriter {
  private readonly ai: AiAssistService;

  constructor(
    apiKey: string | undefined,
    private readonly logger: AppLogger,
  ) {
    this.ai = new AiAssistService(apiKey);
  }

  get available(): boolean {
    return this.ai.configured;
  }

  /**
   * Copy for one destination. `origin` says which route produced it, so the
   * dashboard can be honest about whether a model was involved.
   */
  async draft(
    destination: SocialDestination,
    source: SocialSource,
  ): Promise<{ caption: string; origin: 'ai' | 'template' }> {
    const template = formatForDestination(destination, source);
    if (!this.ai.configured) {
      return { caption: template, origin: 'template' };
    }

    const capability = DESTINATION_CAPABILITIES[destination];
    try {
      const rewritten = await this.ai.assist({
        text: template,
        action: 'improve',
        instructions: [
          `This is a ${capability.label} post.`,
          VOICE[destination],
          `It must be at most ${capability.maxLength} characters.`,
          'Return only the post text.',
        ].join(' '),
      });

      const caption = truncate(rewritten.trim(), capability.maxLength);
      // An empty or unusable answer is a failure, not a post.
      if (caption.length === 0) {
        return { caption: template, origin: 'template' };
      }
      return { caption, origin: 'ai' };
    } catch (error) {
      this.logger.warn({ err: error, destination }, 'AI social copy failed; using the template');
      return { caption: template, origin: 'template' };
    }
  }

  /** Draft every destination at once, each falling back on its own. */
  async draftAll(
    destinations: readonly SocialDestination[],
    source: SocialSource,
  ): Promise<Array<{ destination: SocialDestination; caption: string; origin: 'ai' | 'template' }>> {
    return Promise.all(
      destinations.map(async (destination) => ({
        destination,
        ...(await this.draft(destination, source)),
      })),
    );
  }
}
