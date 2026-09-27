import type { SignedApplicationUpload } from '@iaa/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UploadCancelledError, toFileAnswer, uploadFile, uploadUrlFor } from './upload';

class FakeXhr {
  static last: FakeXhr | null = null;
  upload: { onprogress: ((event: Partial<ProgressEvent>) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  url = '';
  body: FormData | null = null;

  open(_method: string, url: string): void {
    this.url = url;
  }

  send(body: FormData): void {
    this.body = body;
    FakeXhr.last = this;
  }

  abort(): void {
    this.onabort?.();
  }
}

const signed: SignedApplicationUpload = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo/auto/upload',
  fields: { api_key: 'key', signature: 'sig', public_id: 'cv-1', folder: 'iaa/applications/f/d' },
  publicId: 'iaa/applications/f/d/cv-1',
  folder: 'iaa/applications/f/d',
  maxBytes: 1024,
  allowedFormats: ['pdf', 'docx'],
};

const start = (file: File, onProgress = vi.fn()) => {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  const handle = uploadFile(signed, file, onProgress);
  const xhr = FakeXhr.last;
  if (!xhr) {
    throw new Error('No request was sent');
  }
  return { handle, xhr, onProgress };
};

afterEach(() => {
  vi.unstubAllGlobals();
  FakeXhr.last = null;
});

describe('toFileAnswer', () => {
  const file = new File(['x'], 'My CV.pdf');

  it('keeps Cloudinary’s id, link, name, format, size and kind', () => {
    expect(
      toFileAnswer(
        {
          public_id: 'iaa/applications/f/d/cv-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/authenticated/v1/iaa/applications/f/d/cv-1.pdf',
          original_filename: 'My CV',
          format: 'PDF',
          bytes: 2048,
          resource_type: 'image',
        },
        file,
      ),
    ).toEqual({
      publicId: 'iaa/applications/f/d/cv-1',
      url: 'https://res.cloudinary.com/demo/image/authenticated/v1/iaa/applications/f/d/cv-1.pdf',
      name: 'My CV.pdf',
      format: 'pdf',
      bytes: 2048,
      resourceType: 'image',
    });
  });

  it('falls back to the picked file’s name and type for raw documents without a format', () => {
    const docx = new File(['x'], 'Statement.docx');
    expect(
      toFileAnswer(
        {
          public_id: 'iaa/applications/f/d/statement-1',
          secure_url:
            'https://res.cloudinary.com/demo/raw/authenticated/v1/iaa/applications/f/d/statement-1',
          original_filename: 'Statement',
          resource_type: 'raw',
        },
        docx,
      ),
    ).toMatchObject({
      name: 'Statement.docx',
      format: 'docx',
      bytes: docx.size,
      resourceType: 'raw',
    });
  });

  it('refuses a result that could not be a stored file', () => {
    expect(
      toFileAnswer({ public_id: '../escape', secure_url: 'https://x.test/a' }, file),
    ).toBeNull();
    expect(toFileAnswer({ public_id: 'a/b', secure_url: 'javascript:alert(1)' }, file)).toBeNull();
    expect(toFileAnswer({}, file)).toBeNull();
  });
});

describe('uploadFile', () => {
  it('posts the signed fields then the file, tagged with this site’s origin, and reports progress', async () => {
    const file = new File(['%PDF'], 'cv.pdf');
    const { handle, xhr, onProgress } = start(file);

    expect(uploadUrlFor(signed.uploadUrl)).toBe(xhr.url);
    expect(xhr.url).toContain('_origin=');
    expect([...(xhr.body?.keys() ?? [])]).toEqual([
      'api_key',
      'signature',
      'public_id',
      'folder',
      'file',
    ]);

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 3, total: 4 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(0.75);

    xhr.status = 200;
    xhr.responseText = JSON.stringify({
      public_id: 'iaa/applications/f/d/cv-1',
      secure_url:
        'https://res.cloudinary.com/demo/image/authenticated/v1/iaa/applications/f/d/cv-1.pdf',
      original_filename: 'cv',
      format: 'pdf',
      bytes: 4,
    });
    xhr.onload?.();
    await expect(handle.promise).resolves.toMatchObject({ name: 'cv.pdf', bytes: 4 });
  });

  it('passes on Cloudinary’s own reason for refusing a file', async () => {
    const { handle, xhr } = start(new File(['x'], 'cv.pdf'));
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: { message: 'File size too large' } });
    xhr.onload?.();
    await expect(handle.promise).rejects.toThrow('The upload was refused: File size too large');
  });

  it('explains a dropped connection, and tells a cancel apart from a failure', async () => {
    const failed = start(new File(['x'], 'cv.pdf'));
    failed.xhr.onerror?.();
    await expect(failed.handle.promise).rejects.toThrow(/Check your connection/);

    const cancelled = start(new File(['x'], 'cv.pdf'));
    cancelled.handle.abort();
    await expect(cancelled.handle.promise).rejects.toBeInstanceOf(UploadCancelledError);
  });
});
