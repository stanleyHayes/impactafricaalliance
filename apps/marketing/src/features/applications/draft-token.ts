/**
 * Where this browser keeps an applicant's draft token (plan D8).
 *
 * The token is the only key to a draft, so it lives in `localStorage` under
 * one key per form and nowhere else: not in the path or the query string,
 * which reach server logs and analytics. Storage can be missing or refuse
 * writes (private windows, blocked site data), so every access is wrapped and
 * the flow still works for the length of the visit without it.
 */

export const draftStorageKey = (slug: string): string => `iaa:marketing:apply:${slug}`;

// Tokens are 32 random bytes in base64url; anything else in the fragment is
// not ours to take.
const RESUME_FRAGMENT = /^#resume=([A-Za-z0-9_-]{16,200})$/;

export const readStoredToken = (slug: string): string | null => {
  try {
    return window.localStorage.getItem(draftStorageKey(slug));
  } catch {
    return null;
  }
};

export const storeToken = (slug: string, token: string): void => {
  try {
    window.localStorage.setItem(draftStorageKey(slug), token);
  } catch {
    // Without storage the draft still saves; it just cannot be found again
    // from this browser after the tab closes.
  }
};

export const clearStoredToken = (slug: string): void => {
  try {
    window.localStorage.removeItem(draftStorageKey(slug));
  } catch {
    // Nothing to clear if storage is unavailable.
  }
};

/** The token in a `#resume=<token>` address, if there is one. Reads only. */
export const peekResumeToken = (): string | null =>
  RESUME_FRAGMENT.exec(window.location.hash)?.[1] ?? null;

/**
 * Move a `#resume=<token>` link's token into storage and take it out of the
 * address bar, so it is not bookmarked, shared or left in the history.
 *
 * Reads `window.location` rather than the router's location: the fragment is
 * removed with `history.replaceState`, which the router does not observe, and
 * reading the browser's own address keeps the two in step. The router's
 * history state is passed through untouched so Back still works.
 */
export const takeResumeToken = (slug: string): string | null => {
  const token = peekResumeToken();
  if (!token) {
    return null;
  }
  storeToken(slug, token);
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}`);
  } catch {
    // The token is already stored; a fragment left in place is only untidy.
  }
  return token;
};
