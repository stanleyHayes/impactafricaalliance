import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearStoredToken,
  draftStorageKey,
  readStoredToken,
  storeToken,
  takeResumeToken,
} from './draft-token';
import { stubStorage } from './flow-test-utils';

beforeEach(() => {
  stubStorage();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('draft tokens on this device', () => {
  it('keeps one token per form under its own key', () => {
    storeToken('speakers', 'token-a');
    expect(window.localStorage.getItem('iaa:marketing:apply:speakers')).toBe('token-a');
    expect(readStoredToken('speakers')).toBe('token-a');
    expect(readStoredToken('mentors')).toBeNull();
    clearStoredToken('speakers');
    expect(readStoredToken('speakers')).toBeNull();
  });

  it('carries on without storage when the browser refuses it', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => storeToken('speakers', 'token')).not.toThrow();
    expect(readStoredToken('speakers')).toBeNull();
    expect(() => clearStoredToken('speakers')).not.toThrow();
  });
});

describe('takeResumeToken', () => {
  it('moves the token from the address into storage and removes it from the address', () => {
    window.history.replaceState(
      { key: 'router' },
      '',
      '/apply/speakers?ref=email#resume=abcdEFGH_1234-5678',
    );

    expect(takeResumeToken('speakers')).toBe('abcdEFGH_1234-5678');
    expect(window.localStorage.getItem(draftStorageKey('speakers'))).toBe('abcdEFGH_1234-5678');
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?ref=email');
    expect(window.history.state).toEqual({ key: 'router' });
  });

  it('leaves any other fragment alone', () => {
    window.history.replaceState(null, '', '/apply/speakers#team');
    expect(takeResumeToken('speakers')).toBeNull();
    expect(window.location.hash).toBe('#team');

    window.history.replaceState(null, '', '/apply/speakers#resume=short');
    expect(takeResumeToken('speakers')).toBeNull();
    expect(readStoredToken('speakers')).toBeNull();
  });
});
