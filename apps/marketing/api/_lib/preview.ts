import type { ServerResponse } from 'node:http';

/**
 * Shared pieces of the link-preview functions (`event-meta`, `story-meta`).
 *
 * The site is a client-rendered SPA, so its `Seo` component sets Open Graph
 * tags in an effect, which social crawlers never run. Each function serves
 * the same shell with one record's title, description and image already in
 * the HTML. Files under `api/_lib` are not deployed as functions themselves.
 */

export const API_URL = (
  process.env.API_URL ??
  process.env.VITE_API_URL ??
  'https://iaa-api.onrender.com/api'
).replace(/\/$/, '');

export const SITE_URL = 'https://www.impactafricaalliance.org';
/** The brand card shipped with the site: the preview when nothing better is known. */
export const FALLBACK_IMAGE = `${SITE_URL}/brand/og-image.png`;

/**
 * The site image slot holding the default link preview, as named in the
 * shared catalogue (`SITE_IMAGE_SLOTS` in `@iaa/shared`). Written out rather
 * than imported so these functions stay free of workspace packages.
 */
export const SHARE_IMAGE_SLOT = 'social-share-default';

/**
 * How long a crawler waits for the API or the shell. The API sleeps when idle
 * and can take most of a minute to wake; a link preview is not worth that
 * wait, so after this the plain shell is served instead.
 */
export const FETCH_TIMEOUT_MS = 4_000;

/** Crawlers see the preview for five minutes; a stale copy covers a sleeping API for a day. */
export const PREVIEW_CACHE = 'public, s-maxage=300, stale-while-revalidate=86400';

export const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Drop the tags about to be replaced, wherever they sit in the head. */
const stripTag = (html: string, pattern: RegExp): string => html.replace(pattern, '');

/** What one page tells crawlers about itself. */
export interface PageMeta {
  /** The full title, site name included. */
  title: string;
  description: string;
  canonical: string;
  image: string;
  imageAlt: string;
}

/**
 * The shell with its generic tags replaced by `meta`. Every value is
 * escaped: titles and descriptions are written by staff and must never be
 * able to close the attribute they sit in.
 */
export const withMeta = (html: string, meta: PageMeta): string => {
  const cleaned = [
    /<title>[\s\S]*?<\/title>/i,
    /<link\s+rel="canonical"[^>]*>/gi,
    /<meta\s[^>]*name="description"[^>]*>/gi,
    /<meta\s[^>]*property="og:(title|description|url|image|image:alt|image:width|image:height|type)"[^>]*>/gi,
    /<meta\s[^>]*name="twitter:(title|description|image|image:alt|card)"[^>]*>/gi,
  ].reduce(stripTag, html);

  const tags = [
    `<title>${escapeAttribute(meta.title)}</title>`,
    `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" />`,
    `<meta name="description" content="${escapeAttribute(meta.description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${escapeAttribute(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(meta.image)}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(meta.image)}" />`,
  ].join('\n    ');

  // A function, not a string: in a replacement string `$&`, `$'` and `$$` are
  // patterns, so a title such as "Raised $' in a week" would splice the rest
  // of the page into the head.
  return cleaned.replace('</head>', () => `  ${tags}\n  </head>`);
};

/** `fetch`, given up on after `FETCH_TIMEOUT_MS`. */
export const fetchWithTimeout = async (
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * The site's HTML shell. It is a real static file, so this does not re-enter
 * the rewrite that called the function.
 */
export const fetchShell = async (host: string): Promise<string> => {
  const response = await fetchWithTimeout(`https://${host}/index.html`);
  if (!response.ok) {
    throw new Error(`Shell answered ${response.status}`);
  }
  return response.text();
};

/**
 * A record from the API, or null when it is missing, unpublished, slow or
 * unreachable: a preview is a nicety, and every one of those cases falls
 * back to the plain shell.
 */
export const fetchRecord = async <T>(path: string): Promise<T | null> => {
  try {
    const response = await fetchWithTimeout(`${API_URL}${path}`);
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

/** A Cloudinary upload at share-card size rather than the full original. */
export const shareImage = (url: string | undefined): string => {
  if (!url?.startsWith('https://')) return FALLBACK_IMAGE;
  return url.replace(
    /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!s--)/,
    '$1f_auto,q_auto,c_limit,w_1200/',
  );
};

interface SiteImagePreview {
  key?: string;
  isActive?: boolean;
  image?: { url?: string };
}

/**
 * The default link preview set in the dashboard, or the brand card.
 *
 * Asked for only when a record has no picture of its own. The API has just
 * answered for the record, so it is awake and this is one quick request; when
 * it fails anyway, or nothing has been uploaded, the brand card is used, as it
 * was before the slot existed.
 */
export const fetchDefaultShareImage = async (): Promise<string> => {
  const list = await fetchRecord<{ items?: unknown }>('/site-images?pageSize=100');
  const published = list?.items;
  const items: SiteImagePreview[] = Array.isArray(published) ? published : [];
  const upload = items.find(
    (item) => item.key === SHARE_IMAGE_SLOT && item.isActive !== false && item.image?.url,
  );
  return shareImage(upload?.image?.url);
};

/** One sentence-ish summary; crawlers truncate well past this anyway. */
export const summarise = (text: string | undefined, max = 180): string => {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 3)}…` : clean;
};

export const sendHtml = (res: ServerResponse, html: string): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', PREVIEW_CACHE);
  res.end(html);
};

/**
 * What to send when even the shell cannot be fetched. Never cached, so the
 * next request tries again rather than serving this for five minutes.
 */
export const sendUnavailable = (res: ServerResponse): void => {
  res.statusCode = 503;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Retry-After', '5');
  res.end(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Impact Africa Alliance</title></head><body><p>This page could not load just now. Please reload it.</p></body></html>',
  );
};
