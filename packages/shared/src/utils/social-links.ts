import { SOCIAL_DESTINATIONS, type SocialDestination } from '../schemas/social-publication.js';

/**
 * Campaign tagging, so the traffic a post produces can be told apart from the
 * rest.
 *
 * Without this every network arrives in analytics as "social" or, worse, as
 * direct traffic once a link has been through a redirect — and there is then
 * no way to answer which network is worth the effort of posting to.
 */

export interface UtmParameters {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}

/**
 * Add UTM parameters to a URL, leaving any it already carries alone.
 *
 * Overwriting an existing tag would silently reattribute a link somebody
 * tagged deliberately.
 *
 * Written against strings rather than `URL`, which this package cannot assume:
 * it is compiled for a neutral runtime with no DOM lib.
 */
export const withUtm = (url: string, utm: UtmParameters): string => {
  if (!/^https?:\/\//i.test(url)) {
    // Not something we can safely rewrite; hand it back untouched rather than
    // producing a broken link.
    return url;
  }
  const hashAt = url.indexOf('#');
  const hash = hashAt === -1 ? '' : url.slice(hashAt);
  const withoutHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = withoutHash.indexOf('?');
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const query = queryAt === -1 ? '' : withoutHash.slice(queryAt + 1);

  const present = new Set(
    query
      .split('&')
      .filter(Boolean)
      .map((pair) => pair.split('=')[0]),
  );

  const additions = (
    [
      ['utm_source', utm.source],
      ['utm_medium', utm.medium],
      ['utm_campaign', utm.campaign],
      ['utm_content', utm.content],
    ] as Array<[string, string | undefined]>
  )
    .filter(([key, value]) => Boolean(value) && !present.has(key))
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`);

  if (additions.length === 0) {
    return url;
  }
  const nextQuery = [query, ...additions].filter(Boolean).join('&');
  return `${path}?${nextQuery}${hash}`;
};

/** Turn a headline into a campaign name that reads well in an analytics report. */
export const toCampaignSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'update';

/**
 * The tagged link for one destination.
 *
 * `utm_source` is the network itself rather than a generic "social", which is
 * the whole point: it is what separates LinkedIn's traffic from Facebook's.
 */
export const taggedLinkFor = (
  url: string,
  destination: SocialDestination,
  campaign: string,
): string => withUtm(url, { source: destination, medium: 'social', campaign });

/** Every destination's tagged link, for previewing a campaign before it runs. */
export const taggedLinksFor = (
  url: string,
  campaign: string,
  destinations: readonly SocialDestination[] = SOCIAL_DESTINATIONS,
): Record<string, string> =>
  Object.fromEntries(
    destinations.map((destination) => [destination, taggedLinkFor(url, destination, campaign)]),
  );
