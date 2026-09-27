import type { IncomingMessage, ServerResponse } from 'node:http';

import { afterEach, describe, expect, it, vi } from 'vitest';

import eventMeta from '../event-meta';
import storyMeta from '../story-meta';

import { withMeta } from './preview';

const SHELL = `<!doctype html><html><head>
    <title>Impact Africa Alliance</title>
    <link rel="canonical" href="https://www.impactafricaalliance.org/" />
    <meta name="description" content="Generic" />
    <meta property="og:title" content="Generic" />
  </head><body><div id="root"></div></body></html>`;

interface Captured {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const call = async (
  handler: typeof storyMeta,
  query: Record<string, string>,
): Promise<Captured> => {
  const captured: Captured = { status: 200, headers: {}, body: '' };
  const res = {
    set statusCode(value: number) {
      captured.status = value;
    },
    setHeader: (name: string, value: string) => {
      captured.headers[name.toLowerCase()] = value;
    },
    end: (body: string) => {
      captured.body = body;
    },
  } as unknown as ServerResponse;
  const req = {
    headers: { host: 'www.impactafricaalliance.org' },
    url: '/',
    query,
  } as unknown as IncomingMessage & { query: Record<string, string> };
  await handler(req, res);
  return captured;
};

/** The shell for the page itself, then whatever the API says. */
const mockFetch = (api: () => Promise<Response>): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn((url: string) =>
    url.endsWith('/index.html') ? Promise.resolve(new Response(SHELL)) : api(),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => vi.unstubAllGlobals());

describe('withMeta', () => {
  it('replaces the generic tags and escapes everything written into them', () => {
    const html = withMeta(SHELL, {
      title: 'A "quoted" <story>',
      description: 'Fish & chips',
      canonical: 'https://www.impactafricaalliance.org/impact/stories/a',
      image: 'https://example.org/a.jpg',
      imageAlt: 'A picture',
    });
    expect(html).toContain('<title>A &quot;quoted&quot; &lt;story&gt;</title>');
    expect(html).toContain('content="Fish &amp; chips"');
    expect(html).not.toContain('content="Generic"');
    expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
  });

  it('writes dollar signs as they are, never as replacement patterns', () => {
    const html = withMeta(SHELL, {
      title: "Raised $' and $& in a week, $$5 each",
      description: 'Plain',
      canonical: 'https://www.impactafricaalliance.org/impact/stories/a',
      image: 'https://example.org/a.jpg',
      imageAlt: 'A picture',
    });
    expect(html).toContain("<title>Raised $' and $&amp; in a week, $$5 each</title>");
    // The body is still where it was, once, and the head closes once.
    expect(html.match(/<div id="root">/g)).toHaveLength(1);
    expect(html.match(/<\/head>/g)).toHaveLength(1);
  });
});

describe('story-meta', () => {
  it('puts a published story’s own card into the shell', async () => {
    const fetchMock = mockFetch(() =>
      Promise.resolve(
        Response.json({
          title: 'Girls in code',
          excerpt: 'How forty girls wrote their first programs.',
          cover: {
            url: 'https://res.cloudinary.com/iaa/image/upload/v1/stories/cover.jpg',
            alt: 'Girls at a laptop',
          },
          seo: { title: 'Girls in code: a year in Tamale' },
        }),
      ),
    );
    const result = await call(storyMeta, { slug: 'girls-in-code' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/impact-stories\/girls-in-code$/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.body).toContain(
      '<title>Girls in code: a year in Tamale | Impact Africa Alliance</title>',
    );
    expect(result.body).toContain('<meta property="og:type" content="article" />');
    expect(result.body).toContain(
      'href="https://www.impactafricaalliance.org/impact/stories/girls-in-code"',
    );
    expect(result.body).toContain('image/upload/f_auto,q_auto,c_limit,w_1200/v1/stories/cover.jpg');
    expect(result.headers['cache-control']).toBe(
      'public, s-maxage=300, stale-while-revalidate=86400',
    );
  });

  it('serves the plain shell for a draft, an unknown address or a sleeping API', async () => {
    mockFetch(() => Promise.resolve(new Response('{}', { status: 404 })));
    expect((await call(storyMeta, { slug: 'still-a-draft' })).body).toBe(SHELL);

    mockFetch(() => Promise.reject(new DOMException('Timed out', 'AbortError')));
    expect((await call(storyMeta, { slug: 'girls-in-code' })).body).toBe(SHELL);

    const fetchMock = mockFetch(() => Promise.resolve(Response.json({ title: 'Never asked' })));
    expect((await call(storyMeta, { slug: '../../admin' })).body).toBe(SHELL);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers a short, uncached error when the shell itself cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    const result = await call(storyMeta, { slug: 'girls-in-code' });
    expect(result.status).toBe(503);
    expect(result.headers['cache-control']).toBe('no-store');
  });
});

describe('event-meta', () => {
  it('still builds an event’s card as before', async () => {
    mockFetch(() =>
      Promise.resolve(
        Response.json({
          title: 'Coding day',
          description: 'A day of code.',
          startAt: '2026-10-05T09:00:00.000Z',
          location: 'Tamale',
        }),
      ),
    );
    const result = await call(eventMeta, { id: 'event-1' });
    expect(result.body).toContain('<title>Coding day | Impact Africa Alliance</title>');
    expect(result.body).toContain('content="5 October 2026 · Tamale — A day of code."');
    expect(result.body).toContain('href="https://www.impactafricaalliance.org/events/event-1"');
    expect(result.body).toContain(
      'content="https://www.impactafricaalliance.org/brand/og-image.png"',
    );
  });
});
