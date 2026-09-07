import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  adapterFor,
  facebookAdapter,
  instagramAdapter,
  linkedInAdapter,
  toFailure,
  xAdapter,
} from './destination-adapter.js';

vi.mock('axios');

const post = vi.mocked(axios.post);
const credentials = { accessToken: 'token-value', accountId: 'page-1' };

/** An axios error as the adapters actually receive one. */
const providerError = (status: number, message = 'Provider said no'): unknown => {
  const error = Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { error: { message, code: 190 } } },
  });
  vi.mocked(axios.isAxiosError).mockReturnValue(true);
  return error;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axios.isAxiosError).mockReturnValue(false);
});

describe('Facebook', () => {
  it('posts to the Page feed and returns the post id', async () => {
    post.mockResolvedValue({ data: { id: '123_456' } });
    const outcome = await facebookAdapter.publish({ caption: 'Hello' }, credentials);

    expect(outcome).toMatchObject({ ok: true, externalPostId: '123_456' });
    expect(post.mock.calls[0][0]).toContain('/page-1/feed');
  });

  it('surfaces the provider status so the failure can be classified', async () => {
    post.mockRejectedValue(providerError(429));
    const outcome = await facebookAdapter.publish({ caption: 'Hello' }, credentials);

    expect(outcome).toMatchObject({ ok: false, status: 429 });
  });
});

describe('Instagram', () => {
  const igCredentials = {
    ...credentials,
    metadata: { instagramBusinessAccountId: 'ig-9' },
  };

  it('creates a media container and then publishes it', async () => {
    post
      .mockResolvedValueOnce({ data: { id: 'container-1' } })
      .mockResolvedValueOnce({ data: { id: 'ig-post-1' } });

    const outcome = await instagramAdapter.publish(
      { caption: 'Hello', imageUrl: 'https://cdn.test/a.jpg' },
      igCredentials,
    );

    expect(outcome).toMatchObject({ ok: true, externalPostId: 'ig-post-1' });
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][0]).toContain('/ig-9/media');
    expect(post.mock.calls[1][0]).toContain('/ig-9/media_publish');
  });

  it('refuses without an image rather than calling the provider', async () => {
    const outcome = await instagramAdapter.publish({ caption: 'Hello' }, igCredentials);

    expect(outcome).toMatchObject({ ok: false, status: 400 });
    expect(post).not.toHaveBeenCalled();
  });

  it('refuses when the Meta connection has no Instagram account attached', async () => {
    const outcome = await instagramAdapter.publish(
      { caption: 'Hello', imageUrl: 'https://cdn.test/a.jpg' },
      credentials,
    );

    expect(outcome).toMatchObject({ ok: false, status: 400 });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('LinkedIn', () => {
  it('publishes and returns a viewable URL', async () => {
    post.mockResolvedValue({ data: { id: 'urn:li:share:7' } });
    const outcome = await linkedInAdapter.publish({ caption: 'Hello' }, credentials);

    expect(outcome).toMatchObject({ ok: true, externalPostId: 'urn:li:share:7' });
    expect((outcome as { externalPostUrl: string }).externalPostUrl).toContain('urn:li:share:7');
  });

  it('sends the token as a bearer header, never in the body', async () => {
    post.mockResolvedValue({ data: { id: 'urn:li:share:7' } });
    await linkedInAdapter.publish({ caption: 'Hello' }, credentials);

    const [, body, options] = post.mock.calls[0] as [string, unknown, { headers: Record<string, string> }];
    expect(options.headers.Authorization).toBe('Bearer token-value');
    expect(JSON.stringify(body)).not.toContain('token-value');
  });
});

describe('X', () => {
  it('publishes and builds the status URL', async () => {
    post.mockResolvedValue({ data: { data: { id: '99' } } });
    const outcome = await xAdapter.publish({ caption: 'Hello' }, credentials);

    expect(outcome).toMatchObject({
      ok: true,
      externalPostId: '99',
      externalPostUrl: 'https://x.com/i/web/status/99',
    });
  });
});

describe('the adapter registry', () => {
  it('offers the four implemented destinations', () => {
    expect(adapterFor('facebook')).toBeDefined();
    expect(adapterFor('instagram')).toBeDefined();
    expect(adapterFor('linkedin')).toBeDefined();
    expect(adapterFor('x')).toBeDefined();
  });

  it('reports Threads as unimplemented rather than pretending', () => {
    // Queueing a destination with no adapter would leave a row nothing ever sends.
    expect(adapterFor('threads')).toBeUndefined();
  });
});

describe('reading a provider failure', () => {
  it('keeps the status and the provider error code', () => {
    const failure = toFailure(providerError(403, 'Insufficient permission'), 'fallback');
    expect(failure).toMatchObject({
      ok: false,
      status: 403,
      providerErrorCode: '190',
      message: 'Insufficient permission',
    });
  });

  it('reports no status when the request never got an answer', () => {
    const failure = toFailure(new Error('socket hang up'), 'fallback');
    expect(failure.status).toBeUndefined();
    expect(failure.message).toBe('socket hang up');
  });
});
