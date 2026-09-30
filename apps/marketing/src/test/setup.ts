import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

import { SITE_IMAGE_CACHE_KEY } from '../lib/site-image-cache';

// The site images a test served must not become the next test's starting point.
// Some Node versions leave jsdom without storage at all, hence the guard.
afterEach(() => {
  try {
    window.localStorage?.removeItem(SITE_IMAGE_CACHE_KEY);
  } catch {
    // No storage to clear.
  }
});

// jsdom does not implement matchMedia; the AnimatedCounter relies on it.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
