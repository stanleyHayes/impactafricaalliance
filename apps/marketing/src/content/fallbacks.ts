/**
 * Static fallback content used when the CMS has no published rows yet, so the
 * marketing site always looks complete. Mirrors the placeholder copy in
 * docs/website-content.md. Replace by publishing real content in the admin.
 */
export interface FallbackStat {
  key: string;
  value: number;
  suffix: string;
  label: string;
}

export const DEFAULT_STATS: readonly FallbackStat[] = [
  { key: 'countries', value: 5, suffix: '+', label: 'West African Countries Active' },
  { key: 'youth', value: 1000, suffix: '+', label: 'Youth Reached' },
  { key: 'programs', value: 4, suffix: '', label: 'Flagship Programs' },
  { key: 'women', value: 500, suffix: '+', label: 'Women Empowered' },
];

export interface FallbackStory {
  slug: string;
  name: string;
  country: string;
  program: string;
  quote: string;
}

export const DEFAULT_STORIES: readonly FallbackStory[] = [
  {
    slug: 'ama-asante',
    name: 'Ama Asante',
    country: 'Ghana',
    program: 'Digital Skills Hub Graduate',
    quote:
      'Before IAA, I had no idea I could build a business online. Today, my e-commerce store ships across West Africa.',
  },
  {
    slug: 'fatou-diallo',
    name: 'Fatou Diallo',
    country: 'Sierra Leone',
    program: 'Women Empowerment Program',
    quote:
      'The mentorship I received from IAA gave me the confidence to pitch my idea to investors — and win.',
  },
  {
    slug: 'kwame-mensah',
    name: 'Kwame Mensah',
    country: 'Ghana',
    program: 'Climate Action Initiative',
    quote:
      'Our community installed solar panels and reduced our energy costs by 60%. IAA made that possible.',
  },
];
