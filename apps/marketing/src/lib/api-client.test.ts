import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiGet, apiPatch, apiPost, apiRequest } from './api-client';

const fetchMock = vi.fn<typeof fetch>();

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** The URL and init of the only fetch call the test made. */
const onlyCall = (): [string, RequestInit] => {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0] ?? [];
  return [String(url), init ?? {}];
};

describe('marketing API client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a plain read exactly as before, with no headers and no body', async () => {
    fetchMock.mockResolvedValue(json({ id: 'one' }));

    await expect(apiGet('/articles/one')).resolves.toEqual({ id: 'one' });

    const [url, init] = onlyCall();
    expect(url).toMatch(/\/articles\/one$/);
    expect(init).toEqual({ method: 'GET', headers: undefined, body: undefined, signal: null });
  });

  it('still passes a positional abort signal to a read', async () => {
    fetchMock.mockResolvedValue(json({}));
    const controller = new AbortController();

    await apiGet('/events/one', controller.signal);

    expect(onlyCall()[1].signal).toBe(controller.signal);
  });

  it('sends extra headers on a read without adding a content type', async () => {
    fetchMock.mockResolvedValue(json({}));

    await apiGet('/forms/preview', undefined, { headers: { 'x-preview-token': 'abc' } });

    expect(onlyCall()[1].headers).toEqual({ 'x-preview-token': 'abc' });
  });

  it('keeps sending only the JSON content type when a post has no extra headers', async () => {
    fetchMock.mockResolvedValue(json({ id: 'new' }));

    await apiPost('/submissions', { name: 'Ama' });

    const [, init] = onlyCall();
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ name: 'Ama' }));
  });

  it('merges extra headers with the JSON content type on a post', async () => {
    fetchMock.mockResolvedValue(json({ reference: 'APP-ABC123' }));

    await apiPost('/forms/speakers/draft/submit', {}, { headers: { 'x-draft-token': 'tok' } });

    expect(onlyCall()[1].headers).toEqual({
      'x-draft-token': 'tok',
      'Content-Type': 'application/json',
    });
  });

  it('never lets a caller relabel the JSON body', async () => {
    fetchMock.mockResolvedValue(json({}));

    await apiPost('/submissions', { name: 'Ama' }, { headers: { 'Content-Type': 'text/plain' } });

    expect(onlyCall()[1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('sends a patch with its body, headers and signal', async () => {
    fetchMock.mockResolvedValue(json({ saved: true }));
    const controller = new AbortController();

    await apiPatch(
      '/forms/speakers/draft',
      { answers: [] },
      { headers: { 'x-draft-token': 'tok' }, signal: controller.signal },
    );

    const [url, init] = onlyCall();
    expect(url).toMatch(/\/forms\/speakers\/draft$/);
    expect(init).toEqual({
      method: 'PATCH',
      headers: { 'x-draft-token': 'tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
      signal: controller.signal,
    });
  });

  it('turns an error body into an ApiError with its code and details', async () => {
    fetchMock.mockResolvedValue(
      json(
        { error: { code: 'NOT_FOUND', message: 'No such draft', details: { field: 'x' } } },
        404,
      ),
    );

    const failure = apiGet('/forms/speakers/draft').catch((error: unknown) => error);

    await expect(failure).resolves.toBeInstanceOf(ApiError);
    await expect(failure).resolves.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'No such draft',
      details: { field: 'x' },
    });
  });

  it('falls back to a generic ApiError when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('Bad gateway', { status: 502, statusText: 'Bad Gateway' }),
    );

    await expect(apiGet('/events')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Bad Gateway',
    });
  });

  it('resolves to undefined on 204 No Content', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      apiRequest('/forms/speakers/draft', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });
});
