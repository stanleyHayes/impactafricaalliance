import type { SocialDestination } from '@iaa/shared';
import axios from 'axios';

/**
 * The provider-neutral publishing contract.
 *
 * The older gateways answered with a bare error string, which is not enough to
 * decide anything: a rate limit and a rejected caption look identical, so
 * either both get retried forever or neither gets retried at all. An adapter
 * returns the provider's HTTP status so the retry policy can tell them apart.
 */

export interface PublishRequest {
  caption: string;
  imageUrl?: string;
  canonicalUrl?: string;
}

export interface AdapterCredentials {
  accessToken: string;
  accountId: string;
  metadata?: Record<string, unknown>;
}

export interface PublishSuccess {
  ok: true;
  externalPostId?: string;
  externalPostUrl?: string;
}

export interface PublishFailure {
  ok: false;
  /** Provider HTTP status, or undefined when the request never got an answer. */
  status?: number;
  providerErrorCode?: string;
  message: string;
}

export type PublishOutcome = PublishSuccess | PublishFailure;

export interface DestinationAdapter {
  readonly destination: SocialDestination;
  publish(request: PublishRequest, credentials: AdapterCredentials): Promise<PublishOutcome>;
}

const GRAPH_VERSION = 'v20.0';

/** Pull the status and the provider's own message out of a failed call. */
export const toFailure = (error: unknown, fallback: string): PublishFailure => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: { message?: string; code?: number | string } }
      | undefined;
    const failure: PublishFailure = {
      ok: false,
      message: data?.error?.message ?? error.message ?? fallback,
    };
    if (error.response?.status !== undefined) {
      failure.status = error.response.status;
    }
    if (data?.error?.code !== undefined) {
      failure.providerErrorCode = String(data.error.code);
    }
    return failure;
  }
  return { ok: false, message: error instanceof Error ? error.message : fallback };
};

/** Facebook Page feed post. Publishes to a Page, never a personal profile. */
export const facebookAdapter: DestinationAdapter = {
  destination: 'facebook',
  publish: async (request, credentials) => {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${GRAPH_VERSION}/${credentials.accountId}/feed`,
        {
          message: request.caption,
          link: request.canonicalUrl || undefined,
          access_token: credentials.accessToken,
        },
      );
      const id = (response.data as { id?: string }).id;
      const outcome: PublishSuccess = { ok: true };
      if (id) {
        outcome.externalPostId = id;
        outcome.externalPostUrl = `https://www.facebook.com/${id}`;
      }
      return outcome;
    } catch (error) {
      return toFailure(error, 'Facebook publish failed');
    }
  },
};

/**
 * Instagram publishes in two steps: a media container is created, then that
 * container is published. Both have to succeed, and the image has to be at a
 * URL Instagram can fetch for itself.
 */
export const instagramAdapter: DestinationAdapter = {
  destination: 'instagram',
  publish: async (request, credentials) => {
    const igAccountId = credentials.metadata?.instagramBusinessAccountId as string | undefined;
    if (!igAccountId) {
      return {
        ok: false,
        status: 400,
        message: 'This Meta connection has no Instagram professional account attached.',
      };
    }
    if (!request.imageUrl) {
      return { ok: false, status: 400, message: 'Instagram requires an image.' };
    }
    try {
      const container = await axios.post(
        `https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media`,
        {
          image_url: request.imageUrl,
          caption: request.caption,
          access_token: credentials.accessToken,
        },
      );
      const creationId = (container.data as { id?: string }).id;
      if (!creationId) {
        return { ok: false, message: 'Instagram did not return a media container.' };
      }
      const published = await axios.post(
        `https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}/media_publish`,
        { creation_id: creationId, access_token: credentials.accessToken },
      );
      const id = (published.data as { id?: string }).id;
      const outcome: PublishSuccess = { ok: true };
      if (id) {
        outcome.externalPostId = id;
      }
      return outcome;
    } catch (error) {
      return toFailure(error, 'Instagram publish failed');
    }
  },
};

/** LinkedIn member or organisation post, via the author URN on the connection. */
export const linkedInAdapter: DestinationAdapter = {
  destination: 'linkedin',
  publish: async (request, credentials) => {
    try {
      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: credentials.accountId,
          lifecycleState: 'PUBLISHED',
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: request.caption },
              shareMediaCategory: request.canonicalUrl ? 'ARTICLE' : 'NONE',
              media: request.canonicalUrl
                ? [
                    {
                      status: 'READY',
                      originalUrl: request.canonicalUrl,
                      ...(request.imageUrl ? { thumbnails: [{ url: request.imageUrl }] } : {}),
                    },
                  ]
                : undefined,
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          },
        },
      );
      const id = (response.data as { id?: string }).id;
      const outcome: PublishSuccess = { ok: true };
      if (id) {
        outcome.externalPostId = id;
        outcome.externalPostUrl = `https://www.linkedin.com/feed/update/${id}`;
      }
      return outcome;
    } catch (error) {
      return toFailure(error, 'LinkedIn publish failed');
    }
  },
};

export const xAdapter: DestinationAdapter = {
  destination: 'x',
  publish: async (request, credentials) => {
    try {
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text: request.caption },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const id = (response.data as { data?: { id?: string } }).data?.id;
      const outcome: PublishSuccess = { ok: true };
      if (id) {
        outcome.externalPostId = id;
        outcome.externalPostUrl = `https://x.com/i/web/status/${id}`;
      }
      return outcome;
    } catch (error) {
      return toFailure(error, 'X publish failed');
    }
  },
};

/**
 * Threads publishes in two steps like Instagram, but on its own host and with
 * an explicit media type. Unlike Instagram it will post text alone, so the
 * image is optional.
 */
export const threadsAdapter: DestinationAdapter = {
  destination: 'threads',
  publish: async (request, credentials) => {
    const base = `https://graph.threads.net/v1.0/${credentials.accountId}`;
    try {
      const container = await axios.post(`${base}/threads`, {
        media_type: request.imageUrl ? 'IMAGE' : 'TEXT',
        ...(request.imageUrl ? { image_url: request.imageUrl } : {}),
        text: request.caption,
        access_token: credentials.accessToken,
      });
      const creationId = (container.data as { id?: string }).id;
      if (!creationId) {
        return { ok: false, message: 'Threads did not return a container.' };
      }
      const published = await axios.post(`${base}/threads_publish`, {
        creation_id: creationId,
        access_token: credentials.accessToken,
      });
      const id = (published.data as { id?: string }).id;
      const outcome: PublishSuccess = { ok: true };
      if (id) {
        outcome.externalPostId = id;
      }
      return outcome;
    } catch (error) {
      return toFailure(error, 'Threads publish failed');
    }
  },
};

/**
 * Only the destinations that are actually implemented appear here. A
 * destination with no adapter is reported as unsupported rather than silently
 * queued and never sent.
 */
export const DESTINATION_ADAPTERS: Partial<Record<SocialDestination, DestinationAdapter>> = {
  facebook: facebookAdapter,
  instagram: instagramAdapter,
  linkedin: linkedInAdapter,
  x: xAdapter,
  threads: threadsAdapter,
};

export const adapterFor = (destination: SocialDestination): DestinationAdapter | undefined =>
  DESTINATION_ADAPTERS[destination];
