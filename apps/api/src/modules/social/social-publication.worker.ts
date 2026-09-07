import type { DependencyContainer } from 'tsyringe';

import type { AppLogger } from '../../config/logger.js';

import { SocialPublicationService } from './social-publication.service.js';
import { WhatsappAudience } from './whatsapp-audience.js';

/**
 * Drains the publication queue.
 *
 * Built on the same in-process interval the retention jobs use rather than a
 * broker: this deployment runs a single API instance, and adding Redis to post
 * a handful of updates a week would be infrastructure nobody asked for. The
 * claim is atomic at the database, so moving to several instances later does
 * not risk double-posting.
 */

const TICK_MS = 30_000;
const FIRST_RUN_DELAY_MS = 15_000;
/** Ceiling per tick, so one large batch cannot monopolise the process. */
const MAX_PER_TICK = 10;

export const startSocialPublicationWorker = (
  container: DependencyContainer,
  logger: AppLogger,
): (() => void) => {
  let running = false;

  const run = async (): Promise<void> => {
    // A tick that arrives while the previous one is still working is skipped;
    // otherwise a slow provider would have ticks pile up behind it.
    if (running) {
      return;
    }
    running = true;
    try {
      const service = container.resolve(SocialPublicationService);
      for (let processed = 0; processed < MAX_PER_TICK; processed += 1) {
        const claimed = await service.claimNext();
        if (!claimed) {
          break;
        }
        // One destination failing must not stop the rest of the batch.
        try {
          await service.run(claimed as never);
        } catch (error) {
          logger.error({ err: error }, 'Social publication run threw');
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Social publication worker tick failed');
    } finally {
      running = false;
    }
  };

  // WhatsApp authenticates from configuration rather than a Connect click, so
  // its connection row is established here rather than waiting for someone to
  // authorise something that has no authorisation step.
  const initial = setTimeout(() => {
    void container
      .resolve(WhatsappAudience)
      .syncConnection()
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Could not establish the WhatsApp connection');
      })
      .finally(() => void run());
  }, FIRST_RUN_DELAY_MS);
  const interval = setInterval(() => void run(), TICK_MS);

  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
};
