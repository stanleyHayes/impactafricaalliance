/**
 * Up to two capital letters for a person's avatar: `'Ama Mensah'` becomes
 * `'AM'`.
 *
 * The console drew initials in five places, each with its own copy of this.
 * The work modules add people to every task, project and review, so the rule
 * lives here once. A blank name gives `'?'` rather than an empty circle, which
 * reads as a loading avatar.
 */
export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
