/** Turn a title into a URL-safe slug: "Career Launchpad!" -> "career-launchpad". */
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    // Strip accents so "Côte d'Ivoire" becomes "cote-divoire", not "cte-divoire".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
