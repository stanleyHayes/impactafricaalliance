import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Beacon proxy for page views.
 *
 * The browser posts here rather than straight to the API for two reasons. The
 * edge knows which country the request came from and the browser does not, so
 * routing through it is the only way to record a location without asking the
 * visitor's machine to tell us one it could invent. And a same-origin path is
 * far less likely to be blocked than a call to a separate analytics host.
 *
 * Nothing is stored here. The request is forwarded with the geography the edge
 * supplies and a shared key, which is what tells the API those headers came
 * from this function rather than from a page.
 */

const API_URL = (
  process.env.API_URL ??
  process.env.VITE_API_URL ??
  'https://iaa-api.onrender.com/api'
).replace(/\/$/, '');

const INGEST_KEY = process.env.ANALYTICS_INGEST_SECRET ?? '';

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
    // A page view is a path and a referrer. Anything larger is not one.
    if (chunks.reduce((size, part) => size + part.length, 0) > 4_096) break;
  }
  return Buffer.concat(chunks).toString('utf8');
};

const header = (req: IncomingMessage, name: string): string => {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value) ?? '';
};

export default async function handler(
  req: IncomingMessage & { method?: string },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  // Answer before forwarding: the page has nothing to do with the result, and
  // a beacon that waits on a sleeping API would hold the tab's unload open.
  res.statusCode = 204;
  res.end();

  try {
    await fetch(`${API_URL}/analytics/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': header(req, 'user-agent'),
        'x-iaa-ingest-key': INGEST_KEY,
        'x-iaa-country': header(req, 'x-vercel-ip-country'),
        'x-iaa-region': header(req, 'x-vercel-ip-country-region'),
        'x-iaa-city': decodeURIComponent(header(req, 'x-vercel-ip-city')),
      },
      body: await readBody(req),
    });
  } catch {
    // A lost view is not worth a log line on every deploy hiccup, and there is
    // nobody left to tell: the response went out before this ran.
  }
}
