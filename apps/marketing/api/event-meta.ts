import type { IncomingMessage, ServerResponse } from 'node:http';

// `.js` because Vercel runs these functions as Node ES modules, which need the
// extension; TypeScript maps it to the `.ts` file.
import {
  fetchRecord,
  fetchShell,
  FALLBACK_IMAGE,
  sendHtml,
  sendUnavailable,
  SITE_URL,
  summarise,
  withMeta,
} from './_lib/preview.js';

/**
 * Server-rendered link previews for a single event.
 *
 * The site is a client-rendered SPA, so its `Seo` component sets Open Graph
 * tags in an effect — which social crawlers never run. Every shared event link
 * therefore showed the site's generic card. This route serves the same shell
 * with the event's own title, description and image already in the HTML, so
 * WhatsApp, LinkedIn, X, Facebook, Slack and Google see the event itself.
 */

interface EventPreview {
  title?: string;
  description?: string;
  image?: { url?: string; alt?: string };
  startAt?: string;
  location?: string;
}

/** When and where, then what. */
const describe = (event: EventPreview): string => {
  const when = event.startAt
    ? new Date(event.startAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '';
  const prefix = [when, event.location].filter(Boolean).join(' · ');
  const body = summarise(event.description);
  return prefix ? `${prefix} — ${body}` : body;
};

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string> },
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host ?? 'www.impactafricaalliance.org';
  const requested = new URL(req.url ?? '/', `https://${host}`);
  const id = req.query?.id ?? requested.searchParams.get('id') ?? '';

  let shell: string;
  try {
    shell = await fetchShell(host);
  } catch {
    sendUnavailable(res);
    return;
  }

  const event = await fetchRecord<EventPreview>(`/events/${encodeURIComponent(id)}`);
  const html = event
    ? withMeta(shell, {
        title: `${event.title ?? 'Event'} | Impact Africa Alliance`,
        description: describe(event),
        canonical: `${SITE_URL}/events/${id}`,
        image: event.image?.url ?? FALLBACK_IMAGE,
        imageAlt: event.image?.alt ?? event.title ?? 'Impact Africa Alliance',
      })
    : shell;

  sendHtml(res, html);
}
