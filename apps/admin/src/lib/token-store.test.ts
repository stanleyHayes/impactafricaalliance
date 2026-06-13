import { afterEach, describe, expect, it } from 'vitest';

import { tokenStore } from './token-store';

afterEach(() => tokenStore.clear());

describe('tokenStore', () => {
  it('persists and reads back the token pair', () => {
    tokenStore.set({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    expect(tokenStore.access).toBe('access-1');
    expect(tokenStore.refresh).toBe('refresh-1');
  });

  it('clears both tokens', () => {
    tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    tokenStore.clear();
    expect(tokenStore.access).toBeNull();
    expect(tokenStore.refresh).toBeNull();
  });
});
