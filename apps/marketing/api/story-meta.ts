import type { IncomingMessage, ServerResponse } from 'node:http';

// `.js` because Vercel runs these functions as Node ES modules, which need the
// extension; TypeScript maps it to the `.ts` file.
import {
  fetchDefaultShareImage,
  fetchRecord,
  fetchShell,
  sendHtml,
  sendUnavailable,
  shareImage,
  SITE_URL,
  summarise,
  withMeta,
  type PageMeta,
} from './_lib/preview.js';

/**
 * Server-rendered link previews for one impact story (`/impact/stories/:slug`),
 * on the pattern of `event-meta`.
 *
 * Only published stories come back from the public API, so a draft's
 * address shows the plain shell with the site's own card: nothing about an
 * unpublished story ever reaches a crawler.
 */

interface MediaPreview {
  url?: string;
  alt?: string;
}

interface StoryPreview {
  title?: string;
  excerpt?: string;
  cover?: MediaPreview;
  seo?: { title?: string; description?: string; image?: MediaPreview | null };
}

// The shape the site's own router accepts; anything else is not a story address.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The address the rewrite passed on, or '' when it is not a story address at all. */
const slugFrom = (
  req: IncomingMessage & { query?: Record<string, string> },
  host: string,
): string => {
  const requested = new URL(req.url ?? '/', `https://${host}`);
  const slug = (req.query?.slug ?? requested.searchParams.get('slug') ?? '').toLowerCase();
  return SLUG.test(slug) && slug.length <= 120 ? slug : '';
};

/**
 * A story's own search and sharing settings first, then its title, excerpt
 * and cover, then the site's default link preview.
 */
const storyMeta = async (story: StoryPreview, slug: string): Promise<PageMeta> => {
  const image = story.seo?.image ?? story.cover;
  return {
    title: `${story.seo?.title ?? story.title ?? 'Impact story'} | Impact Africa Alliance`,
    description: summarise(story.seo?.description ?? story.excerpt),
    canonical: `${SITE_URL}/impact/stories/${slug}`,
    image: image?.url?.startsWith('https://')
      ? shareImage(image.url)
      : await fetchDefaultShareImage(),
    imageAlt: image?.alt || story.title || 'Impact Africa Alliance',
  };
};

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string> },
  res: ServerResponse,
): Promise<void> {
  const host = req.headers.host ?? 'www.impactafricaalliance.org';
  const slug = slugFrom(req, host);

  let shell: string;
  try {
    shell = await fetchShell(host);
  } catch {
    sendUnavailable(res);
    return;
  }

  const story = slug
    ? await fetchRecord<StoryPreview>(`/impact-stories/${encodeURIComponent(slug)}`)
    : null;
  sendHtml(res, story ? withMeta(shell, await storyMeta(story, slug)) : shell);
}
