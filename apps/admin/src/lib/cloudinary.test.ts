import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UPLOAD_PERMISSION_NOTE } from '../components/files/upload-permission';

import type * as ApiClient from './api-client';
import { ApiError, api } from './api-client';
import { DOCUMENT_ACCEPT, uploadToCloudinary } from './cloudinary';

vi.mock('./api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  api: { post: vi.fn() },
}));
const signed = {
  cloudName: 'demo',
  apiKey: 'public-key',
  timestamp: 123,
  signature: 'test-signature',
  folder: 'events',
  allowedFormats: 'jpg,png,gif,webp,pdf',
  maxFileSize: 5 * 1024 * 1024,
};
const signedDocument = {
  ...signed,
  allowedFormats: 'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt',
  maxFileSize: 10 * 1024 * 1024,
};

// A fresh Response per call: a body can only be read once.
const cloudinaryAnswers = (body: Record<string, unknown>): ReturnType<typeof vi.spyOn> =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body))));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.post).mockResolvedValue(signed);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('signed media upload', () => {
  it('sends the signed fields and returns media metadata for persistence', async () => {
    const fetchMock = cloudinaryAnswers({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/event.png',
      public_id: 'events/one',
      width: 800,
      height: 600,
    });
    const result = await uploadToCloudinary(
      new File(['image'], 'event.png', { type: 'image/png' }),
    );
    expect(api.post).toHaveBeenCalledWith('/admin/media/sign', {});
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(body.get('signature')).toBe(signed.signature);
    expect(body.get('folder')).toBe('events');
    expect(body.has('max_file_size')).toBe(false);
    expect(body.get('allowed_formats')).toBe(signed.allowedFormats);
    expect(result.publicId).toBe('events/one');
    expect(result.width).toBe(800);
  });

  it('adds an image to the media library unless told not to', async () => {
    cloudinaryAnswers({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/event.png',
      public_id: 'events/one',
    });
    await uploadToCloudinary(new File(['image'], 'event.png', { type: 'image/png' }), 'events');
    expect(api.post).toHaveBeenCalledWith(
      '/admin/media-library',
      expect.objectContaining({ publicId: 'events/one', folder: 'events' }),
    );

    vi.mocked(api.post).mockClear();
    await uploadToCloudinary(new File(['image'], 'event.png', { type: 'image/png' }), 'events', {
      register: false,
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/media/sign', {});
  });

  it('says who can help when the signature is refused for want of permission', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN', 'Missing required permission'),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(
      uploadToCloudinary(new File(['doc'], 'minutes.docx'), 'documents', {
        register: false,
        profile: 'document',
      }),
    ).rejects.toThrow(UPLOAD_PERMISSION_NOTE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes other signing failures on as they are', async () => {
    vi.mocked(api.post).mockRejectedValue(
      new ApiError(503, 'UNAVAILABLE', 'Cloudinary is not configured'),
    );
    await expect(
      uploadToCloudinary(new File(['image'], 'event.png', { type: 'image/png' })),
    ).rejects.toThrow('Cloudinary is not configured');
  });

  it('rejects unsupported files before requesting a signature', async () => {
    await expect(
      uploadToCloudinary(new File(['svg'], 'event.svg', { type: 'image/svg+xml' })),
    ).rejects.toThrow('Unsupported file type');
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('signed document upload', () => {
  it('signs with the document profile and returns what a document list shows', async () => {
    vi.mocked(api.post).mockResolvedValue(signedDocument);
    cloudinaryAnswers({
      secure_url: 'https://res.cloudinary.com/demo/raw/upload/iaa/budget.xlsx',
      public_id: 'iaa/budget.xlsx',
      bytes: 48_000,
      resource_type: 'raw',
      original_filename: 'budget',
    });

    const result = await uploadToCloudinary(
      new File(['sheet'], 'Budget 2026.xlsx', { type: '' }),
      'documents',
      { register: false, profile: 'document' },
    );

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/admin/media/sign-document', {});
    expect(result).toEqual({
      url: 'https://res.cloudinary.com/demo/raw/upload/iaa/budget.xlsx',
      publicId: 'iaa/budget.xlsx',
      // Cloudinary leaves the format off raw files, so the extension stands in.
      format: 'xlsx',
      bytes: 48_000,
      resourceType: 'raw',
      originalFilename: 'Budget 2026.xlsx',
    });
  });

  it('accepts office files by extension, whatever type the browser reports', () => {
    expect(DOCUMENT_ACCEPT.split(',')).toEqual(
      expect.arrayContaining(['.docx', '.xlsx', '.pptx', '.csv', '.pdf']),
    );
  });

  it('refuses a file type the API would not sign, before asking for a signature', async () => {
    await expect(
      uploadToCloudinary(
        new File(['x'], 'setup.exe', { type: 'application/octet-stream' }),
        'documents',
        {
          profile: 'document',
        },
      ),
    ).rejects.toThrow('Unsupported file type');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('refuses a document over 10 MB before asking for a signature', async () => {
    const large = new File(['x'], 'minutes.pdf', { type: 'application/pdf' });
    Object.defineProperty(large, 'size', { value: 11 * 1024 * 1024 });
    await expect(uploadToCloudinary(large, 'documents', { profile: 'document' })).rejects.toThrow(
      'Maximum size is 10 MB',
    );
    expect(api.post).not.toHaveBeenCalled();
  });
});
