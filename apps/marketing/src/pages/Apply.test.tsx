import { cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPublicForm } from '../features/applications/api';
import {
  findScreenHeading,
  makeForm,
  renderApplyRoute,
  stubStorage,
  withInstantMotion,
} from '../features/applications/flow-test-utils';
import { recordPageView } from '../lib/analytics';

vi.mock('../features/applications/api');
vi.mock('../lib/analytics', () => ({ recordPageView: vi.fn() }));

withInstantMotion();

beforeEach(() => {
  stubStorage();
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.mocked(getPublicForm).mockResolvedValue(makeForm());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Apply page', () => {
  it('records one page view for the path, since it sits outside Layout', async () => {
    renderApplyRoute('/apply/speakers');
    await findScreenHeading('Speak at our summit');
    expect(recordPageView).toHaveBeenCalledTimes(1);
    expect(recordPageView).toHaveBeenCalledWith('/apply/speakers');
  });

  it('titles the page after the form and lets search engines index a published form', async () => {
    renderApplyRoute('/apply/speakers');
    await findScreenHeading('Speak at our summit');
    await waitFor(() =>
      expect(document.title).toBe('Speaker application | Impact Africa Alliance'),
    );
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Tell us about yourself.',
    );
  });
});
