import { afterEach, describe, expect, it, vi } from 'vitest';

import { downscaleImage } from './downscale-image';

const fileOf = (bytes: number, type = 'image/jpeg', name = 'photo.jpg'): File =>
  new File([new Uint8Array(bytes)], name, { type });

/** Stands in for the browser pieces jsdom does not implement. */
const givenBrowserCanResize = (producedBytes: number): void => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
    callback(new Blob([new Uint8Array(producedBytes)], { type: 'image/webp' }));
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('oversized photographs', () => {
  it('shrinks one that is past the cap', async () => {
    givenBrowserCanResize(900_000);
    const result = await downscaleImage(fileOf(8 * 1024 * 1024));

    expect(result.size).toBe(900_000);
    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('photo.webp');
  });

  it('caps the longest edge rather than the shortest', async () => {
    givenBrowserCanResize(500_000);
    const canvas = vi.spyOn(document, 'createElement');
    await downscaleImage(fileOf(6 * 1024 * 1024));

    const created = canvas.mock.results
      .map((entry) => entry.value as HTMLElement)
      .find((element): element is HTMLCanvasElement => element instanceof HTMLCanvasElement);
    // 4000x3000 bounded to a 2400px longest edge.
    expect(created?.width).toBe(2400);
    expect(created?.height).toBe(1800);
  });
});

describe('files it should not touch', () => {
  it('leaves a small file alone', async () => {
    givenBrowserCanResize(10);
    const original = fileOf(200_000);
    expect(await downscaleImage(original)).toBe(original);
  });

  it('leaves an animated GIF alone, which a canvas would flatten', async () => {
    givenBrowserCanResize(10);
    const original = fileOf(4 * 1024 * 1024, 'image/gif', 'loop.gif');
    expect(await downscaleImage(original)).toBe(original);
  });

  it('leaves a PDF alone', async () => {
    givenBrowserCanResize(10);
    const original = fileOf(4 * 1024 * 1024, 'application/pdf', 'report.pdf');
    expect(await downscaleImage(original)).toBe(original);
  });

  it('keeps the original when re-encoding would make it bigger', async () => {
    givenBrowserCanResize(9 * 1024 * 1024);
    const original = fileOf(8 * 1024 * 1024);
    expect(await downscaleImage(original)).toBe(original);
  });
});

describe('when the browser will not cooperate', () => {
  it('returns the original rather than failing the upload', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('undecodable')));
    const original = fileOf(8 * 1024 * 1024, 'image/heic', 'IMG_0001.heic');
    expect(await downscaleImage(original)).toBe(original);
  });

  it('returns the original where createImageBitmap does not exist', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const original = fileOf(8 * 1024 * 1024);
    expect(await downscaleImage(original)).toBe(original);
  });
});
