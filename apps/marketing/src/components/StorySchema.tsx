import { ORG, type PublicImpactStory } from '@iaa/shared';
import { useEffect } from 'react';

import { storySeo, storyUrl } from '../features/impact-stories/story-utils';
import { useDefaultShareImage } from '../lib/site-images';

const SCRIPT_ID = 'iaa-story-schema';

/**
 * Emits schema.org Article JSON-LD for one published impact story, following
 * the `EventSchema` pattern.
 *
 * Google asks for a headline, an image and both dates on an Article, so all
 * are always present: the image falls back to the site's share card, and a
 * story's dates come from when it was first published and last edited. The
 * Alliance is both author and publisher, because stories speak for the
 * organisation rather than for the member of staff who wrote them.
 */
export const StorySchema = ({ story }: { story: PublicImpactStory }): null => {
  const shareDefault = useDefaultShareImage().url;
  useEffect(() => {
    const seo = storySeo(story);
    const url = storyUrl(story.slug);
    const organisation = {
      '@type': 'Organization',
      name: ORG.name,
      url: ORG.website,
      logo: { '@type': 'ImageObject', url: `${ORG.website}/brand/logo-primary.png` },
    };
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: story.title.slice(0, 110),
      description: seo.description,
      image: [seo.image ?? shareDefault],
      datePublished: story.publishedAt,
      dateModified: story.updatedAt,
      author: organisation,
      publisher: organisation,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      ...(story.tags.length > 0 ? { keywords: story.tags.join(', ') } : {}),
    };

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);

    // Removed on unmount so one story's markup never outlives its page.
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [story, shareDefault]);

  return null;
};
