import type { Article } from '@iaa/shared';

const WORDS_PER_MINUTE = 220;

export const getArticleDate = (article: Article): string =>
  article.publishedAt ?? article.createdAt;

export const formatArticleDate = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

export const formatArticleTag = (tag: string): string =>
  tag
    .split('-')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const articleText = (body: string): string => {
  if (typeof DOMParser === 'undefined' || !/<[a-z][\s\S]*>/i.test(body)) {
    return body;
  }

  return new DOMParser().parseFromString(body, 'text/html').body.textContent ?? body;
};

export const estimateReadingTime = (body: string): number => {
  const words = articleText(body).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};
