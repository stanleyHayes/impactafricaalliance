/**
 * Records which pages people read.
 *
 * Posts to this site's own /api/collect, which adds the country the edge saw
 * and forwards it on. Same-origin so it survives the blockers that stop calls
 * to third-party analytics hosts, and `keepalive` so a view still lands when
 * the click that follows it navigates away.
 */
const ENDPOINT = '/api/collect';

/** Vite only proxies /api in production builds; locally there is nothing there. */
const enabled = import.meta.env.PROD;

export const recordPageView = (path: string): void => {
  if (!enabled) return;
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer || undefined }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics must never be the reason a page fails to work.
  }
};
