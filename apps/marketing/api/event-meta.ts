import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Server-rendered link previews for a single event.
 *
 * The site is a client-rendered SPA, so its `Seo` component sets Open Graph
 * tags in an effect — which social crawlers never run. Every shared event link
 * therefore showed the site's generic card. This route serves the same shell
 * with the event's own title, description and image already in the HTML, so
 * WhatsApp, LinkedIn, X, Facebook, Slack and Google see the event itself.
 */

const API_URL = (
  process.env.API_URL ??
  process.env.VITE_API_URL ??
  'https://iaa-api.onrender.com/api'
).replace(/\/$/, '');

const SITE_URL = 'https://www.impactafricaalliance.org';
const FALLBACK_IMAGE = `${SITE_URL}/brand/og-image.png`;

interface EventPreview {
  title?: string;
  description?: string;
  image?: { url?: string; alt?: string };
  startAt?: string;
  location?: string;
}

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** One clean sentence-ish summary; crawlers truncate well past this anyway. */
const summarise = (event: EventPreview): string => {
  const text = (event.description ?? '').replace(/\s+/g, ' ').trim();
  const when = event.startAt
    ? new Date(event.startAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '';
  const prefix = [when, event.location].filter(Boolean).join(' · ');
  const body = text.length > 180 ? `${text.slice(0, 177)}…` : text;
  return prefix ? `${prefix} — ${body}` : body;
};

/** Drop the tags we are about to replace, wherever they sit in the head. */
const stripTag = (html: string, pattern: RegExp): string => html.replace(pattern, '');

const withPreview = (html: string, event: EventPreview, canonical: string): string => {
  const title = `${event.title ?? 'Event'} | Impact Africa Alliance`;
  const description = summarise(event);
  const image = event.image?.url ?? FALLBACK_IMAGE;
  const imageAlt = event.image?.alt ?? event.title ?? 'Impact Africa Alliance';

  const cleaned = [
    /<title>[\s\S]*?<\/title>/i,
    /<link\s+rel="canonical"[^>]*>/gi,
    /<meta\s[^>]*name="description"[^>]*>/gi,
    /<meta\s[^>]*property="og:(title|description|url|image|image:alt|image:width|image:height|type)"[^>]*>/gi,
    /<meta\s[^>]*name="twitter:(title|description|image|image:alt|card)"[^>]*>/gi,
  ].reduce(stripTag, html);

  const tags = [
    `<title>${escapeAttribute(title)}</title>`,
    `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
    `<meta name="description" content="${escapeAttribute(description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${escapeAttribute(title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(image)}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(image)}" />`,
  ].join('\n    ');

  return cleaned.replace('</head>', `  ${tags}\n  </head>`);
};

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string> },
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host ?? 'www.impactafricaalliance.org';
  const requested = new URL(req.url ?? '/', `https://${host}`);
  const id = req.query?.id ?? requested.searchParams.get('id') ?? '';

  // The shell is a real static file, so this does not re-enter the rewrite.
  const shell = await fetch(`https://${host}/index.html`).then((response) => response.text());

  let html = shell;
  try {
    const response = await fetch(`${API_URL}/events/${encodeURIComponent(id)}`);
    if (response.ok) {
      const event = (await response.json()) as EventPreview;
      html = withPreview(shell, event, `${SITE_URL}/events/${id}`);
    }
  } catch {
    // A preview is a nicety; never let it stop the page from rendering.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.end(html);
}
