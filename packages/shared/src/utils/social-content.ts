import {
  DESTINATION_CAPABILITIES,
  type SocialDestination,
} from '../schemas/social-publication.js';

/**
 * Turning one article into copy that suits each network.
 *
 * Posting identical text everywhere reads as automation, and on Instagram it
 * reads as a mistake — a bare URL in a caption is not clickable. These are
 * plain templates on purpose: the spec allows AI to draft the copy but forbids
 * publishing from depending on it, so this is what runs when no model is in
 * play, and what an editor sees and edits in the preview either way.
 */

export interface SocialSource {
  title: string;
  excerpt?: string;
  url?: string;
  tags?: string[];
}

/** X counts every link as a fixed width regardless of its real length. */
const X_LINK_WIDTH = 23;
const ELLIPSIS = '…';

/** Trim to a limit on a word boundary, so a sentence never ends mid-word. */
export const truncate = (text: string, max: number): string => {
  const clean = text.trim();
  if (clean.length <= max) {
    return clean;
  }
  const hard = clean.slice(0, Math.max(0, max - 1));
  const lastSpace = hard.lastIndexOf(' ');
  // Only respect the word boundary when it is not throwing most of the text
  // away; a single very long word should still be cut.
  const body = lastSpace > max * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${body.trimEnd()}${ELLIPSIS}`;
};

/** "Youth Skills" -> "#youthskills", dropping anything that cannot be a tag. */
export const toHashtag = (tag: string): string => {
  const cleaned = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30);
  return cleaned ? `#${cleaned}` : '';
};

const hashtags = (tags: readonly string[] | undefined, limit: number): string =>
  (tags ?? [])
    .map(toHashtag)
    .filter(Boolean)
    .slice(0, limit)
    .join(' ');

const paragraphs = (...parts: Array<string | undefined>): string =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n\n');

/** One sentence from the excerpt, for the formats that only have room for one. */
const firstSentence = (text: string): string => {
  const match = /^.*?[.!?](\s|$)/.exec(text.trim());
  return (match ? match[0] : text).trim();
};

const facebook = (source: SocialSource): string =>
  paragraphs(source.title, source.excerpt, source.url ? `Read more: ${source.url}` : undefined);

const linkedin = (source: SocialSource): string =>
  paragraphs(
    source.title,
    source.excerpt,
    'Read the full story on our website.',
    source.url,
  );

const instagram = (source: SocialSource): string => {
  const capability = DESTINATION_CAPABILITIES.instagram;
  // No "read more" link: a caption URL is not clickable, so pointing at one
  // only teaches people that our links do not work.
  const tags = hashtags(source.tags, 8);
  const body = paragraphs(source.title, source.excerpt);
  const room = capability.maxLength - (tags ? tags.length + 2 : 0);
  return paragraphs(truncate(body, room), tags || undefined);
};

const x = (source: SocialSource): string => {
  const capability = DESTINATION_CAPABILITIES.x;
  if (!source.url) {
    return truncate(paragraphs(source.title, source.excerpt), capability.maxLength);
  }
  // The link is a fixed width to X regardless of its real length, and needs a
  // space before it.
  const room = capability.maxLength - X_LINK_WIDTH - 1;
  return `${truncate(source.title, room)} ${source.url}`;
};

const threads = (source: SocialSource): string => {
  const capability = DESTINATION_CAPABILITIES.threads;
  const summary = source.excerpt ? firstSentence(source.excerpt) : '';
  return truncate(paragraphs(source.title, summary), capability.maxLength);
};

const FORMATTERS: Record<SocialDestination, (source: SocialSource) => string> = {
  facebook,
  instagram,
  linkedin,
  x,
  threads,
};

/**
 * The starting copy for one destination. Always within that network's limit,
 * so the preview an editor opens is already publishable.
 */
export const formatForDestination = (
  destination: SocialDestination,
  source: SocialSource,
): string => truncate(FORMATTERS[destination](source), DESTINATION_CAPABILITIES[destination].maxLength);

/** Draft copy for several destinations at once, for the preview step. */
export const formatForDestinations = (
  destinations: readonly SocialDestination[],
  source: SocialSource,
): Record<string, string> =>
  Object.fromEntries(
    destinations.map((destination) => [destination, formatForDestination(destination, source)]),
  );
