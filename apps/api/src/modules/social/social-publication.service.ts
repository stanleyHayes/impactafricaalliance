import { createHash } from 'node:crypto';

import {
  DESTINATION_CAPABILITIES,
  destinationRejection,
  needsReconnect,
  type SocialPublicationInput,
  type SocialPublishRequest,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { NotFoundError, ValidationError } from '../../common/errors.js';
import type { AppLogger } from '../../config/logger.js';
import {
  adapterFor,
  type AdapterCredentials,
} from '../../providers/social/destination-adapter.js';
import { TOKENS } from '../../tokens.js';

import { PublicationAttemptModel } from './publication-attempt.model.js';
import {
  MAX_ATTEMPTS,
  classifyFailure,
  isRetryable,
  nextAttemptAt,
  sanitizeProviderError,
} from './publication-retry.js';
import { SocialAccountRepository } from './social-account.repository.js';
import { SocialOAuthService } from './social-oauth.service.js';
import {
  SocialPublicationModel,
  type SocialPublicationDocument,
} from './social-publication.model.js';
import { WhatsappAudience } from './whatsapp-audience.js';

/**
 * Creating, queueing and running one publication per destination.
 *
 * Nothing here talks to a provider from inside an HTTP request. Publishing
 * creates rows and returns; the worker picks them up. That is what lets a
 * slow Instagram container or a rate-limited X call stop being the article
 * editor's problem.
 */
@injectable()
export class SocialPublicationService {
  constructor(
    @inject(SocialAccountRepository) private readonly accounts: SocialAccountRepository,
    @inject(SocialOAuthService) private readonly oauth: SocialOAuthService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(WhatsappAudience) private readonly whatsapp: WhatsappAudience,
  ) {}

  /**
   * The same publication asked for twice must not post twice. Keyed on what
   * makes a publication distinct: where it is going, what it says, and when.
   */
  private idempotencyKey(parts: {
    articleId?: string;
    connectionId: string;
    destination: string;
    caption: string;
    scheduledFor?: Date;
  }): string {
    return createHash('sha256')
      .update(
        [
          parts.articleId ?? 'adhoc',
          parts.connectionId,
          parts.destination,
          parts.scheduledFor?.toISOString() ?? 'now',
          parts.caption,
        ].join('|'),
      )
      .digest('hex');
  }

  /**
   * Turn a publish request into one queued row per destination.
   *
   * Validation that a provider would reject anyway happens here, while there
   * is still someone to tell.
   */
  async queue(
    request: SocialPublishRequest,
    options: { articleId?: string; userId?: string },
  ): Promise<SocialPublicationDocument[]> {
    const scheduledFor = request.scheduledFor ? new Date(request.scheduledFor) : undefined;
    const created: SocialPublicationDocument[] = [];

    for (const target of request.destinations) {
      await this.assertPublishable(target);

      const key = this.idempotencyKey({
        ...(options.articleId ? { articleId: options.articleId } : {}),
        connectionId: target.connectionId,
        destination: target.destination,
        caption: target.caption,
        ...(scheduledFor ? { scheduledFor } : {}),
      });

      // Upsert on the key: asking twice yields the same row, never a second post.
      const publication = await SocialPublicationModel.findOneAndUpdate(
        { idempotencyKey: key },
        {
          $setOnInsert: {
            idempotencyKey: key,
            ...(options.articleId ? { articleId: options.articleId } : {}),
            connectionId: target.connectionId,
            destination: target.destination,
            caption: target.caption,
            ...(target.imageUrl ? { imageUrl: target.imageUrl } : {}),
            ...(target.canonicalUrl ? { canonicalUrl: target.canonicalUrl } : {}),
            ...(scheduledFor ? { scheduledFor } : {}),
            status: 'queued',
            nextAttemptAt: scheduledFor ?? new Date(),
            retryCount: 0,
            ...(options.userId ? { createdBy: options.userId } : {}),
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).exec();
      created.push(publication);
    }

    return created;
  }

  /**
   * Refuse a destination now, while there is still someone to tell.
   *
   * Every one of these would otherwise surface as a failed row on a worker
   * minutes later, which is a far worse way to learn that Instagram needed an
   * image or that an account needs reconnecting.
   */
  private async assertPublishable(target: SocialPublicationInput): Promise<void> {
    if (!adapterFor(target.destination)) {
      throw new ValidationError(
        `${DESTINATION_CAPABILITIES[target.destination].label} publishing is not enabled yet.`,
      );
    }
    const connection = await this.accounts.findById(target.connectionId);
    if (!connection) {
      throw new NotFoundError('Social connection');
    }
    if (needsReconnect(connection.status)) {
      throw new ValidationError(
        `The ${connection.platform} connection needs reconnecting before it can publish.`,
      );
    }
    const rejection = destinationRejection(target.destination, {
      caption: target.caption,
      ...(target.imageUrl ? { imageUrl: target.imageUrl } : {}),
    });
    if (rejection) {
      throw new ValidationError(rejection);
    }
  }

  /**
   * Take the next due publication, marking it in flight in the same operation
   * so a second worker cannot pick up the same row and post it twice.
   */
  async claimNext(now: Date = new Date()): Promise<SocialPublicationDocument | null> {
    return SocialPublicationModel.findOneAndUpdate(
      { status: 'queued', nextAttemptAt: { $lte: now } },
      { $set: { status: 'processing', lockedAt: now } },
      { new: true, sort: { nextAttemptAt: 1 } },
    ).exec();
  }

  /** Publish one claimed row and record what happened. */
  async run(publication: SocialPublicationDocument & { _id: unknown }): Promise<void> {
    const id = String(publication._id);
    const attemptNumber = publication.retryCount + 1;
    const startedAt = new Date();
    const adapter = adapterFor(publication.destination);

    if (!adapter) {
      await this.finishPermanently(id, 'UNSUPPORTED', 'This destination is not enabled.');
      return;
    }

    const credentials = await this.credentialsFor(id, publication.connectionId);
    if (!credentials) {
      return;
    }

    // A broadcast goes to people, not to a feed, so the list is fetched here
    // rather than inside the adapter — adapters never touch the database.
    const recipients =
      DESTINATION_CAPABILITIES[publication.destination].broadcast === true
        ? await this.whatsapp.recipients()
        : undefined;
    const outcome = await adapter.publish(
      {
        caption: publication.caption,
        ...(publication.imageUrl ? { imageUrl: publication.imageUrl } : {}),
        ...(publication.canonicalUrl ? { canonicalUrl: publication.canonicalUrl } : {}),
        ...(recipients ? { recipients } : {}),
      },
      credentials,
    );

    if (outcome.ok) {
      await SocialPublicationModel.updateOne(
        { _id: publication._id },
        {
          $set: {
            status: 'published',
            publishedAt: new Date(),
            retryCount: attemptNumber,
            ...(outcome.externalPostId ? { externalPostId: outcome.externalPostId } : {}),
            ...(outcome.externalPostUrl ? { externalPostUrl: outcome.externalPostUrl } : {}),
          },
          $unset: { lockedAt: 1, errorCode: 1, errorMessage: 1, nextAttemptAt: 1 },
        },
      ).exec();
      await this.recordAttempt(id, attemptNumber, startedAt, { result: 'succeeded' });
      return;
    }

    const kind = classifyFailure(outcome.status);
    const message = sanitizeProviderError(outcome.message);
    await this.recordAttempt(id, attemptNumber, startedAt, {
      result: 'failed',
      ...(outcome.status !== undefined ? { providerHttpStatus: outcome.status } : {}),
      ...(outcome.providerErrorCode ? { providerErrorCode: outcome.providerErrorCode } : {}),
      sanitizedError: message,
    });

    if (kind === 'auth') {
      await this.markConnection(publication.connectionId, 'reauth_required');
    }

    if (isRetryable(kind, attemptNumber)) {
      await SocialPublicationModel.updateOne(
        { _id: publication._id },
        {
          $set: {
            status: 'queued',
            retryCount: attemptNumber,
            errorCode: kind,
            errorMessage: message,
            nextAttemptAt: nextAttemptAt(attemptNumber, new Date()),
          },
          $unset: { lockedAt: 1 },
        },
      ).exec();
      return;
    }

    await SocialPublicationModel.updateOne(
      { _id: publication._id },
      {
        $set: { status: 'failed', retryCount: attemptNumber, errorCode: kind, errorMessage: message },
        $unset: { lockedAt: 1, nextAttemptAt: 1 },
      },
    ).exec();
    this.logger.warn(
      { publicationId: id, destination: publication.destination, kind, attemptNumber },
      'Social publication failed',
    );
  }

  /**
   * Resolve what this publication needs to authenticate with, marking it
   * failed and returning undefined when it cannot — so the caller has one
   * thing to check rather than three.
   */
  private async credentialsFor(
    id: string,
    connectionId: string,
  ): Promise<AdapterCredentials | undefined> {
    const connection = await this.accounts.findById(connectionId);
    if (!connection) {
      await this.finishPermanently(id, 'NO_CONNECTION', 'The social connection no longer exists.');
      return undefined;
    }

    const credentials = await this.oauth.getValidAccessToken(connection.platform);
    if (!credentials) {
      await this.markConnection(connectionId, 'reauth_required');
      await this.finishPermanently(id, 'REAUTH_REQUIRED', 'Reconnect this account to publish.');
      return undefined;
    }

    return {
      accessToken: credentials.accessToken,
      accountId: credentials.account.accountId,
      ...(credentials.account.metadata ? { metadata: credentials.account.metadata } : {}),
      ...this.whatsapp.template,
    };
  }

  /** Put a failed publication back in the queue, without touching its siblings. */
  async retry(id: string): Promise<SocialPublicationDocument> {
    const publication = await SocialPublicationModel.findById(id).exec();
    if (!publication) {
      throw new NotFoundError('Publication');
    }
    if (publication.status === 'published') {
      // Retrying a success is how duplicates happen.
      throw new ValidationError('This destination has already been published.');
    }
    const updated = await SocialPublicationModel.findByIdAndUpdate(
      id,
      {
        $set: { status: 'queued', nextAttemptAt: new Date(), retryCount: 0 },
        $unset: { errorCode: 1, errorMessage: 1, lockedAt: 1 },
      },
      { new: true },
    ).exec();
    return updated as SocialPublicationDocument;
  }

  async cancel(id: string): Promise<SocialPublicationDocument> {
    const publication = await SocialPublicationModel.findById(id).exec();
    if (!publication) {
      throw new NotFoundError('Publication');
    }
    if (publication.status === 'published') {
      throw new ValidationError('This destination has already been published.');
    }
    const updated = await SocialPublicationModel.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' }, $unset: { nextAttemptAt: 1, lockedAt: 1 } },
      { new: true },
    ).exec();
    return updated as SocialPublicationDocument;
  }

  async listForArticle(articleId: string): Promise<SocialPublicationDocument[]> {
    return SocialPublicationModel.find({ articleId }).sort({ createdAt: -1 }).exec();
  }

  async list(limit = 50): Promise<SocialPublicationDocument[]> {
    return SocialPublicationModel.find().sort({ createdAt: -1 }).limit(limit).exec();
  }

  private async finishPermanently(id: string, code: string, message: string): Promise<void> {
    await SocialPublicationModel.updateOne(
      { _id: id },
      {
        $set: { status: 'failed', errorCode: code, errorMessage: message },
        $unset: { lockedAt: 1, nextAttemptAt: 1 },
      },
    ).exec();
  }

  private async markConnection(
    connectionId: string,
    status: 'reauth_required' | 'error',
  ): Promise<void> {
    await this.accounts.setStatus(connectionId, status);
  }

  private async recordAttempt(
    publicationId: string,
    attemptNumber: number,
    startedAt: Date,
    detail: {
      result: 'succeeded' | 'failed';
      providerHttpStatus?: number;
      providerErrorCode?: string;
      sanitizedError?: string;
    },
  ): Promise<void> {
    await PublicationAttemptModel.create({
      publicationId,
      attemptNumber,
      startedAt,
      completedAt: new Date(),
      ...detail,
    });
  }
}

export { MAX_ATTEMPTS };
