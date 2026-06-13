import { ORG } from '@iaa/shared';
import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
}

const upsertMeta = (name: string, content: string): void => {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

/** Lightweight per-route SEO: sets document title + meta description. */
export const Seo = ({ title, description }: SeoProps): null => {
  useEffect(() => {
    document.title = `${title} | ${ORG.name}`;
    if (description) {
      upsertMeta('description', description);
    }
  }, [title, description]);
  return null;
};
