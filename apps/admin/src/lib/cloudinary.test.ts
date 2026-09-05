import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api-client';
import { uploadToCloudinary } from './cloudinary';

vi.mock('./api-client', () => ({ api: { post: vi.fn() } }));
const signed = {
  cloudName: 'demo',
  apiKey: 'public-key',
  timestamp: 123,
  signature: 'test-signature',
  folder: 'events',
  allowedFormats: 'jpg,png,gif,webp,pdf',
  maxFileSize: 5 * 1024 * 1024,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue(signed);
});
describe('signed media upload', () => {
  it('sends the signed fields and returns media metadata for persistence', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            secure_url: 'https://res.cloudinary.com/demo/image/upload/event.png',
            public_id: 'events/one',
            width: 800,
            height: 600,
          }),
        ),
      );
    const result = await uploadToCloudinary(
      new File(['image'], 'event.png', { type: 'image/png' }),
    );
    expect(api.post).toHaveBeenCalledWith('/admin/media/sign', {});
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get('signature')).toBe(signed.signature);
    expect(body.get('folder')).toBe('events');
    expect(result.publicId).toBe('events/one');
    expect(result.width).toBe(800);
    fetchMock.mockRestore();
  });
  it('rejects unsupported files before requesting a signature', async () => {
    await expect(
      uploadToCloudinary(new File(['svg'], 'event.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('Unsupported file type');
    expect(api.post).not.toHaveBeenCalled();
  });
});
