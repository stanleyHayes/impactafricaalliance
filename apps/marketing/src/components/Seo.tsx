import { ORG } from '@iaa/shared';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SeoProps {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string): void => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${selector}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, selector);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
};

const upsertLink = (rel: string, href: string): void => {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
};

const removeRobots = (): void => {
  const tag = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (tag) {
    tag.remove();
  }
};

/**
 * Origin used for canonical URLs and the default OG image.
 * Uses the serving origin so previews work on Vercel deployments and the
 * production domain alike, falling back to the org website when unavailable.
 */
const servingOrigin = (): string =>
  typeof window === 'undefined' ? ORG.website : window.location.origin;

/** Per-route SEO: title, description, canonical, Open Graph and Twitter Cards. */
export const Seo = ({
  title,
  description = ORG.description,
  image,
  imageAlt = `${ORG.name} — ${ORG.tagline}`,
  type = 'website',
  noindex = false,
}: SeoProps): null => {
  const { pathname } = useLocation();
  const origin = servingOrigin();
  const canonicalUrl = `${origin}${pathname === '/' ? '' : pathname}`;
  const resolvedImage = image ?? `${origin}/brand/og-image.png`;
  const fullTitle = `${title} | ${ORG.name}`;

  useEffect(() => {
    document.title = fullTitle;

    upsertMeta('description', 'name', description);
    upsertLink('canonical', canonicalUrl);

    // Open Graph
    upsertMeta('og:site_name', 'property', ORG.name);
    upsertMeta('og:title', 'property', fullTitle);
    upsertMeta('og:description', 'property', description);
    upsertMeta('og:type', 'property', type);
    upsertMeta('og:url', 'property', canonicalUrl);
    upsertMeta('og:image', 'property', resolvedImage);
    upsertMeta('og:image:alt', 'property', imageAlt);
    upsertMeta('og:locale', 'property', 'en_GH');

    // Twitter Cards
    upsertMeta('twitter:card', 'name', 'summary_large_image');
    upsertMeta('twitter:title', 'name', fullTitle);
    upsertMeta('twitter:description', 'name', description);
    upsertMeta('twitter:image', 'name', resolvedImage);
    upsertMeta('twitter:image:alt', 'name', imageAlt);

    if (noindex) {
      upsertMeta('robots', 'name', 'noindex, nofollow');
    } else {
      removeRobots();
    }

    return () => {
      // Keep the tags in place; they will be overwritten by the next route.
      // This avoids empty-head flashes during SPA navigation.
    };
  }, [canonicalUrl, description, fullTitle, imageAlt, noindex, resolvedImage, title, type]);

  return null;
};
