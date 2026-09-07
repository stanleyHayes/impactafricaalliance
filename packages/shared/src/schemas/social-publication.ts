import { z } from 'zod';

import { type Timestamped } from './common.js';

/**
 * Where a publication can be sent.
 *
 * Distinct from the *connection* platforms, which are the accounts an
 * administrator authorises: one Meta connection carries both Facebook and
 * Instagram destinations.
 */
export const SOCIAL_DESTINATIONS = ['facebook', 'instagram', 'linkedin', 'x', 'threads'] as const;
export type SocialDestination = (typeof SOCIAL_DESTINATIONS)[number];

/** The accounts an administrator connects, which destinations are published through. */
export const SOCIAL_CONNECTION_PLATFORMS = ['meta', 'linkedin', 'x', 'threads'] as const;
export type SocialConnectionPlatform = (typeof SOCIAL_CONNECTION_PLATFORMS)[number];

/** Lifecycle of one destination's publication, tracked independently of the others. */
export const SOCIAL_PUBLICATION_STATUSES = [
  'draft',
  'queued',
  'processing',
  'published',
  'failed',
  'cancelled',
] as const;
export type SocialPublicationStatus = (typeof SOCIAL_PUBLICATION_STATUSES)[number];

/** Whether a stored connection can still be published through. */
export const SOCIAL_CONNECTION_STATUSES = [
  'active',
  'expired',
  'reauth_required',
  'revoked',
  'error',
] as const;
export type SocialConnectionStatus = (typeof SOCIAL_CONNECTION_STATUSES)[number];

/** A status the administrator has to act on before publishing can work again. */
export const needsReconnect = (status: SocialConnectionStatus): boolean =>
  status === 'expired' || status === 'reauth_required' || status === 'revoked';

/**
 * What a destination can actually carry.
 *
 * Held as data rather than branching inside each adapter, so the dashboard can
 * tell an administrator that Instagram needs an image *before* they queue a
 * post rather than after it fails.
 */
export interface DestinationCapabilities {
  destination: SocialDestination;
  label: string;
  /** The connection that authorises it. */
  connection: SocialConnectionPlatform;
  text: boolean;
  image: boolean;
  video: boolean;
  /** Whether a URL in the body is clickable. Instagram's is not. */
  clickableLink: boolean;
  requiresMedia: boolean;
  maxLength: number;
}

export const DESTINATION_CAPABILITIES: Record<SocialDestination, DestinationCapabilities> = {
  facebook: {
    destination: 'facebook',
    label: 'Facebook',
    connection: 'meta',
    text: true,
    image: true,
    video: true,
    clickableLink: true,
    requiresMedia: false,
    maxLength: 63_206,
  },
  instagram: {
    destination: 'instagram',
    label: 'Instagram',
    connection: 'meta',
    text: true,
    image: true,
    video: true,
    // A URL in an Instagram caption is plain text, so the copy must not lean on it.
    clickableLink: false,
    // Instagram publishes media, not status updates: a caption alone cannot post.
    requiresMedia: true,
    maxLength: 2_200,
  },
  linkedin: {
    destination: 'linkedin',
    label: 'LinkedIn',
    connection: 'linkedin',
    text: true,
    image: true,
    video: true,
    clickableLink: true,
    requiresMedia: false,
    maxLength: 3_000,
  },
  x: {
    destination: 'x',
    label: 'X',
    connection: 'x',
    text: true,
    image: true,
    video: true,
    clickableLink: true,
    requiresMedia: false,
    maxLength: 280,
  },
  threads: {
    destination: 'threads',
    label: 'Threads',
    connection: 'threads',
    text: true,
    image: true,
    video: true,
    clickableLink: true,
    requiresMedia: false,
    maxLength: 500,
  },
};

export const destinationsFor = (connection: SocialConnectionPlatform): SocialDestination[] =>
  SOCIAL_DESTINATIONS.filter((key) => DESTINATION_CAPABILITIES[key].connection === connection);

/** Why a destination cannot accept what is about to be sent, or undefined if it can. */
export const destinationRejection = (
  destination: SocialDestination,
  content: { caption: string; imageUrl?: string },
): string | undefined => {
  const capability = DESTINATION_CAPABILITIES[destination];
  if (capability.requiresMedia && !content.imageUrl) {
    return `${capability.label} can only publish with an image.`;
  }
  if (content.caption.trim().length === 0) {
    return `${capability.label} needs a caption.`;
  }
  if (content.caption.length > capability.maxLength) {
    return `${capability.label} allows ${capability.maxLength} characters; this is ${content.caption.length}.`;
  }
  return undefined;
};

export const socialPublicationInputSchema = z.object({
  destination: z.enum(SOCIAL_DESTINATIONS),
  connectionId: z.string().min(1),
  caption: z.string().min(1).max(63_206),
  imageUrl: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
});
export type SocialPublicationInput = z.infer<typeof socialPublicationInputSchema>;

/** Publish now, or at a stated time. Absent means now. */
export const socialPublishRequestSchema = z.object({
  destinations: z.array(socialPublicationInputSchema).min(1).max(20),
  scheduledFor: z.string().datetime().optional(),
  /** Kept for display; the record itself is stored in UTC. */
  timezone: z.string().max(60).optional(),
});
export type SocialPublishRequest = z.infer<typeof socialPublishRequestSchema>;

/** What the preview step is given to draft copy from. */
export const socialSourceSchema = z.object({
  title: z.string().min(1).max(300),
  excerpt: z.string().max(2000).optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

export const socialPreviewRequestSchema = z.object({
  destinations: z.array(z.enum(SOCIAL_DESTINATIONS)).min(1),
  source: socialSourceSchema,
});
export type SocialPreviewRequest = z.infer<typeof socialPreviewRequestSchema>;

export interface SocialPublication extends Timestamped {
  id: string;
  articleId?: string;
  connectionId: string;
  destination: SocialDestination;
  status: SocialPublicationStatus;
  caption: string;
  imageUrl?: string;
  canonicalUrl?: string;
  scheduledFor?: string;
  publishedAt?: string;
  externalPostId?: string;
  externalPostUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  idempotencyKey: string;
}
