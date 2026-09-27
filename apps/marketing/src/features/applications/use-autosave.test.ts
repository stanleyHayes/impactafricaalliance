import type { DraftSaveInput } from '@iaa/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api-client';

import {
  AUTOSAVE_DELAY_MS,
  SLOW_SAVE_MS,
  createAutosaveEngine,
  retryDelayMs,
  type AutosaveStatus,
} from './use-autosave';

const payload = (name: string): DraftSaveInput => ({
  answers: [{ fieldId: 'full-name', value: name }],
  currentStepId: 'about',
});

const setup = (save: (input: DraftSaveInput) => Promise<void>) => {
  let status: AutosaveStatus = { kind: 'idle' };
  const engine = createAutosaveEngine({
    save,
    isEnabled: () => true,
    onStatus: (update) => {
      status = typeof update === 'function' ? update(status) : update;
    },
  });
  return { engine, status: () => status };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('autosave engine', () => {
  it('saves once, after a quiet spell, with the latest answers', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { engine, status } = setup(save);

    engine.schedule(payload('A'));
    await vi.advanceTimersByTimeAsync(1000);
    engine.schedule(payload('Ama'));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(payload('Ama'));
    expect(status().kind).toBe('saved');
    expect(engine.hasUnsent()).toBe(false);
  });

  it('does not send answers the server already has', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { engine } = setup(save);

    await engine.flush(payload('Ama'));
    engine.schedule(payload('Ama'));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('retries a server that cannot be reached, further apart each time, keeping the newest answers', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new ApiError(503, 'HTTP_ERROR', 'Service Unavailable'))
      .mockResolvedValue(undefined);
    const { engine, status } = setup(save);

    await engine.flush(payload('Ama'));
    expect(status()).toEqual({ kind: 'retrying', attempt: 1 });
    expect(engine.hasUnsent()).toBe(true);

    engine.schedule(payload('Ama Mensah'));
    await vi.advanceTimersByTimeAsync(retryDelayMs(1));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(payload('Ama Mensah'));
    expect(status()).toEqual({ kind: 'retrying', attempt: 2 });

    await vi.advanceTimersByTimeAsync(retryDelayMs(2) - 1);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(3);
    expect(status().kind).toBe('saved');
    expect(engine.hasUnsent()).toBe(false);
  });

  it('grows the retry gap to a ceiling', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map(retryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
  });

  it('stops retrying a refusal that trying again will not fix', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Bad'));
    const { engine, status } = setup(save);

    await engine.flush(payload('Ama'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(status().kind).toBe('failed');
  });

  it('says the server may be waking when a save is slow', async () => {
    let finish: () => void = () => undefined;
    const save = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { engine, status } = setup(save);

    const done = engine.flush(payload('Ama'));
    expect(status()).toEqual({ kind: 'saving', slow: false });
    await vi.advanceTimersByTimeAsync(SLOW_SAVE_MS);
    expect(status()).toEqual({ kind: 'saving', slow: true });

    finish();
    await done;
    expect(status().kind).toBe('saved');
  });

  it('sends a change made during a save straight after it', async () => {
    let finish: () => void = () => undefined;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockResolvedValue(undefined);
    const { engine } = setup(save);

    const first = engine.flush(payload('Ama'));
    engine.schedule(payload('Ama Mensah'));
    finish();
    await first;
    await vi.advanceTimersByTimeAsync(0);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith(payload('Ama Mensah'));
  });

  it('keeps the quiet period for changes made after a slow save catches up', async () => {
    let finish: () => void = () => undefined;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)))
      .mockResolvedValue(undefined);
    const { engine } = setup(save);

    engine.schedule(payload('A'));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    expect(save).toHaveBeenCalledTimes(1);

    // A change while that save is on its way, which is sent as soon as it lands.
    await vi.advanceTimersByTimeAsync(500);
    engine.schedule(payload('Am'));
    await vi.advanceTimersByTimeAsync(500);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);

    // The next change waits for its own pause, not for a timer left over
    // from the change already sent.
    await vi.advanceTimersByTimeAsync(500);
    engine.schedule(payload('Ama'));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(save).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith(payload('Ama'));
  });

  it('clears the status on cancel, since nothing is waiting any more', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Bad'));
    const { engine, status } = setup(save);

    await engine.flush(payload('Ama'));
    expect(status().kind).toBe('failed');
    expect(engine.hasUnsent()).toBe(true);

    engine.cancel();
    expect(status().kind).toBe('idle');
    expect(engine.hasUnsent()).toBe(false);
  });

  it('waits while offline and sends as soon as the connection is back', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { engine, status } = setup(save);

    await engine.flush(payload('Ama'));
    expect(status().kind).toBe('offline');
    expect(save).not.toHaveBeenCalled();

    online.mockReturnValue(true);
    engine.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledWith(payload('Ama'));
    expect(status().kind).toBe('saved');
  });

  it('sends what is waiting when the page goes away, and nothing after cancel', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const first = setup(save);
    first.engine.schedule(payload('Ama'));
    first.engine.dispose();
    expect(save).toHaveBeenCalledWith(payload('Ama'));

    save.mockClear();
    const second = setup(save);
    second.engine.schedule(payload('Ama'));
    second.engine.cancel();
    second.engine.dispose();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);
    expect(save).not.toHaveBeenCalled();
  });
});
