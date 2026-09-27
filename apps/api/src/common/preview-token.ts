import type { PreviewLink } from '@iaa/shared';
import jwt from 'jsonwebtoken';

import type { AppConfig } from '../config/env.js';

/** The things that can be previewed on the public site before they are public. */
export const PREVIEW_KINDS = ['form', 'impact-story'] as const;
export type PreviewKind = (typeof PREVIEW_KINDS)[number];

/**
 * Written into every preview token and required on the way back in. Access
 * tokens are signed with the same secret, and the audience is what stops one
 * kind of token being accepted as the other.
 */
export const PREVIEW_TOKEN_AUDIENCE = 'iaa-preview';

/**
 * How long a preview link works. Two hours covers a review meeting; a link
 * forwarded beyond the team stops working the same afternoon.
 */
export const PREVIEW_TOKEN_TTL_SECONDS = 2 * 60 * 60;

/**
 * The marketing page for each kind. The token goes after `#`, so the browser
 * never sends it to a server or an analytics tool.
 */
export const PREVIEW_PATHS: Record<PreviewKind, string> = {
  form: '/apply/preview',
  'impact-story': '/impact/stories/preview',
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

export interface PreviewTarget {
  kind: PreviewKind;
  /** The record's id. */
  id: string;
}

export interface SignedPreviewToken {
  token: string;
  /** ISO time the token stops working. */
  expiresAt: string;
}

type PreviewConfig = Pick<AppConfig, 'jwt'>;

/**
 * Sign a token that lets the marketing site show one unpublished record.
 *
 * The subject names the kind as well as the id, so a token issued to preview
 * a form cannot be replayed to read a story that happens to share an id. The
 * token carries nothing else: no email, no role and no permissions, which is
 * also why it can never pass for an access token.
 */
export const signPreviewToken = (
  { kind, id }: PreviewTarget,
  config: PreviewConfig,
): SignedPreviewToken => {
  const expiresAtSeconds = Math.floor(Date.now() / 1000) + PREVIEW_TOKEN_TTL_SECONDS;
  const token = jwt.sign({ exp: expiresAtSeconds }, config.jwt.accessSecret, {
    algorithm: 'HS256',
    audience: PREVIEW_TOKEN_AUDIENCE,
    subject: `${kind}:${id}`,
  });
  return { token, expiresAt: new Date(expiresAtSeconds * 1000).toISOString() };
};

/**
 * The record id a preview token was issued for, or null when the token is
 * missing, expired, tampered with, signed for something else, or for another
 * kind of record.
 *
 * Null rather than an error, because the caller answers every one of those
 * cases the same way: this preview is not available.
 */
export const verifyPreviewToken = (
  token: string | null | undefined,
  kind: PreviewKind,
  config: PreviewConfig,
): string | null => {
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
      audience: PREVIEW_TOKEN_AUDIENCE,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return null;
    }
    const prefix = `${kind}:`;
    if (!payload.sub.startsWith(prefix)) {
      return null;
    }
    const id = payload.sub.slice(prefix.length);
    return OBJECT_ID.test(id) ? id : null;
  } catch {
    return null;
  }
};

/**
 * A ready-to-open preview link on the public site, as `POST .../preview`
 * returns it.
 */
export const createPreviewLink = (
  target: PreviewTarget,
  config: Pick<AppConfig, 'jwt' | 'siteUrl'>,
): PreviewLink => {
  const { token, expiresAt } = signPreviewToken(target, config);
  const base = config.siteUrl.replace(/\/+$/, '');
  return { url: `${base}${PREVIEW_PATHS[target.kind]}#${token}`, expiresAt };
};
