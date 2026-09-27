import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError, ValidationError } from '../common/errors.js';
import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../config/logger.js';

import {
  CloudinaryMediaProvider,
  DELIVERY_LINK_SECONDS,
  DOCUMENT_ALLOWED_FORMATS,
} from './media.provider.js';

const secret = 'test-secret';
const config = {
  cloudinary: { cloudName: 'demo', apiKey: 'key', apiSecret: secret, folder: 'iaa' },
} as AppConfig;
const unconfigured = { cloudinary: { folder: 'iaa' } } as AppConfig;

const makeLogger = () => ({ error: vi.fn(), warn: vi.fn(), debug: vi.fn() });
const provider = (appConfig: AppConfig = config, logger = makeLogger()) =>
  new CloudinaryMediaProvider(appConfig, logger as unknown as AppLogger);

const formId = '64b7f0c2a1b2c3d4e5f60718';
const draftId = '64b7f0c2a1b2c3d4e5f60719';
const target = {
  formId,
  draftId,
  fieldId: 'cv',
  formats: ['pdf', 'docx'],
  maxBytes: 5 * 1024 * 1024,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Cloudinary upload signatures', () => {
  it.each([
    ['createSignedUpload', 'iaa', 5],
    ['createSignedCvUpload', 'iaa/cvs', 5],
    ['createSignedDocumentUpload', 'iaa/documents', 10],
  ] as const)('%s signs exactly the fields Cloudinary validates', (method, folder, megabytes) => {
    const signed = provider()[method]();
    expect(signed.signature).toBe(
      cloudinary.utils.api_sign_request(
        {
          timestamp: signed.timestamp,
          folder: signed.folder,
          allowed_formats: signed.allowedFormats,
        },
        secret,
      ),
    );
    expect(signed.maxFileSize).toBe(megabytes * 1024 * 1024);
    expect(signed.folder).toBe(folder);
  });

  it('lets staff attach office documents as well as images', () => {
    const formats = provider().createSignedDocumentUpload().allowedFormats.split(',');
    expect(formats).toEqual(DOCUMENT_ALLOWED_FORMATS.split(','));
    expect(formats).toEqual(expect.arrayContaining(['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'txt']));
  });

  it('answers 503 for every signer when Cloudinary is not configured, as before', () => {
    const media = provider(unconfigured);
    expect(() => media.createSignedUpload()).toThrow(ServiceUnavailableError);
    expect(() => media.createSignedDocumentUpload()).toThrow(ServiceUnavailableError);
    expect(() => media.createSignedApplicationUpload(target)).toThrow(ServiceUnavailableError);
  });
});

describe('applicant upload signatures', () => {
  it('signs every field the browser sends apart from the key and the signature', () => {
    const signed = provider().createSignedApplicationUpload(target);
    const { api_key: apiKey, signature, ...sent } = signed.fields;
    expect(apiKey).toBe('key');
    expect(signature).toBe(cloudinary.utils.api_sign_request(sent, secret));
    expect(Object.keys(sent).sort()).toEqual([
      'allowed_formats',
      'folder',
      'overwrite',
      'public_id',
      'timestamp',
      'type',
    ]);
  });

  it('puts the file in the draft’s own folder under a name the server chose', () => {
    const signed = provider().createSignedApplicationUpload(target);
    expect(signed.folder).toBe(`iaa/applications/${formId}/${draftId}`);
    expect(signed.fields.folder).toBe(signed.folder);
    expect(signed.fields.public_id).toMatch(/^cv-[a-f0-9]{16}$/);
    expect(signed.publicId).toBe(`${signed.folder}/${signed.fields.public_id}`);
    expect(signed.fields.type).toBe('authenticated');
    expect(signed.fields.overwrite).toBe('false');
    expect(signed.fields.allowed_formats).toBe('pdf,docx');
    expect(signed.allowedFormats).toEqual(['pdf', 'docx']);
    expect(signed.maxBytes).toBe(5 * 1024 * 1024);
    expect(signed.uploadUrl).toBe('https://api.cloudinary.com/v1_1/demo/auto/upload');
  });

  it('gives each upload its own name, so one file cannot replace another', () => {
    const media = provider();
    const first = media.createSignedApplicationUpload(target);
    const second = media.createSignedApplicationUpload(target);
    expect(first.fields.public_id).not.toBe(second.fields.public_id);
  });

  it('breaks the signature if the browser changes the folder or the name', () => {
    const signed = provider().createSignedApplicationUpload(target);
    const { signature, ...rest } = signed.fields;
    const sent: Record<string, string> = { ...rest };
    delete sent.api_key;
    expect(cloudinary.utils.api_sign_request(sent, secret)).toBe(signature);
    expect(
      cloudinary.utils.api_sign_request({ ...sent, folder: 'iaa/applications/other' }, secret),
    ).not.toBe(signature);
    expect(cloudinary.utils.api_sign_request({ ...sent, public_id: 'cv-mine' }, secret)).not.toBe(
      signature,
    );
    expect(cloudinary.utils.api_sign_request({ ...sent, type: 'upload' }, secret)).not.toBe(
      signature,
    );
  });

  it.each(['docx', 'xlsx', 'pptx', 'odt', 'txt', 'csv'])(
    'ends a %s file’s name with its extension, which a raw file needs to download by name',
    (extension) => {
      const signed = provider().createSignedApplicationUpload({ ...target, extension });
      expect(signed.fields.public_id).toMatch(new RegExp(`^cv-[a-f0-9]{16}\\.${extension}$`));
      expect(signed.publicId).toBe(`${signed.folder}/${signed.fields.public_id}`);
      // The extension is part of the signed name, so it cannot be changed either.
      const { signature, ...rest } = signed.fields;
      const sent: Record<string, string> = { ...rest };
      delete sent.api_key;
      expect(cloudinary.utils.api_sign_request(sent, secret)).toBe(signature);
      expect(
        cloudinary.utils.api_sign_request(
          { ...sent, public_id: String(sent.public_id).replace(`.${extension}`, '') },
          secret,
        ),
      ).not.toBe(signature);
    },
  );

  it.each(['pdf', 'jpg', 'png'])(
    'leaves a %s file’s name bare, as Cloudinary keeps its format',
    (extension) => {
      const signed = provider().createSignedApplicationUpload({ ...target, extension });
      expect(signed.fields.public_id).toMatch(/^cv-[a-f0-9]{16}$/);
    },
  );

  it.each([
    { draftId: '../../site' },
    { formId: 'a/b' },
    { fieldId: 'cv.pdf' },
    { formats: [] },
    { formats: ['pdf,exe'] },
    { extension: 'docx/../x' },
    { extension: 'doc.x' },
  ])('refuses a target that could leave its folder or widen its formats: %o', (change) => {
    expect(() => provider().createSignedApplicationUpload({ ...target, ...change })).toThrow(
      ValidationError,
    );
  });
});

describe('authenticated delivery links', () => {
  /** The link's query, with its signature checked against every other parameter. */
  const signedQuery = (url: string | null): URLSearchParams => {
    expect(url).not.toBeNull();
    const parsed = new URL(url ?? '');
    const params = new URLSearchParams(parsed.search);
    const { signature, api_key: apiKey, ...signed } = Object.fromEntries(params);
    expect(apiKey).toBe('key');
    expect(signature).toBe(cloudinary.utils.api_sign_request(signed, secret));
    return params;
  };

  it('gives a download link to the authenticated copy that expires within the hour', () => {
    const now = Math.floor(Date.now() / 1000);
    const url = provider().signedDeliveryUrl({
      publicId: 'iaa/applications/x/y/cv-1',
      format: 'pdf',
    });
    expect(url).toMatch(/^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/image\/download\?/);
    const params = signedQuery(url);
    expect(params.get('public_id')).toBe('iaa/applications/x/y/cv-1');
    expect(params.get('format')).toBe('pdf');
    expect(params.get('type')).toBe('authenticated');
    expect(params.get('attachment')).toBe('true');
    const expiresAt = Number(params.get('expires_at'));
    expect(expiresAt).toBeGreaterThan(now);
    expect(expiresAt).toBeLessThanOrEqual(now + DELIVERY_LINK_SECONDS + 5);
    expect(expiresAt).toBeGreaterThanOrEqual(now + DELIVERY_LINK_SECONDS - 5);
  });

  it('does not add the format to a raw file, whose name already has it', () => {
    const url = provider().signedDeliveryUrl({
      publicId: 'iaa/applications/x/y/cv-1.docx',
      resourceType: 'raw',
      format: 'docx',
    });
    expect(url).toMatch(/^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/raw\/download\?/);
    const params = signedQuery(url);
    expect(params.get('public_id')).toBe('iaa/applications/x/y/cv-1.docx');
    expect(params.has('format')).toBe(false);
  });

  it('is null when Cloudinary is not configured', () => {
    expect(provider(unconfigured).signedDeliveryUrl({ publicId: 'a' })).toBeNull();
  });
});

describe('inspecting and deleting stored files', () => {
  it('reports the stored size and format', async () => {
    const resource = vi
      .spyOn(cloudinary.api, 'resource')
      .mockResolvedValue({ bytes: 1234, format: 'pdf', resource_type: 'image' });
    const facts = await provider().inspectAsset({ publicId: 'iaa/applications/x/y/cv-1' });
    expect(facts).toEqual({ bytes: 1234, format: 'pdf', resourceType: 'image' });
    expect(resource).toHaveBeenCalledWith(
      'iaa/applications/x/y/cv-1',
      expect.objectContaining({ resource_type: 'image', type: 'authenticated' }),
    );
  });

  it('tries a raw file when the type was not recorded and no image exists', async () => {
    const resource = vi
      .spyOn(cloudinary.api, 'resource')
      .mockRejectedValueOnce({ error: { message: 'Not found', http_code: 404 } })
      .mockResolvedValueOnce({ bytes: 10, format: 'docx', resource_type: 'raw' });
    const facts = await provider().inspectAsset({ publicId: 'iaa/a/b/cv-1.docx' });
    expect(facts).toEqual({ bytes: 10, format: 'docx', resourceType: 'raw' });
    expect(resource).toHaveBeenCalledTimes(2);
  });

  it('refuses a file Cloudinary does not have', async () => {
    vi.spyOn(cloudinary.api, 'resource').mockRejectedValue({
      error: { message: 'Not found', http_code: 404 },
    });
    await expect(provider().inspectAsset({ publicId: 'iaa/a/b/gone' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('answers 503 when Cloudinary fails, without logging its credentials', async () => {
    const logger = makeLogger();
    vi.spyOn(cloudinary.api, 'resource').mockRejectedValue({
      request_options: { auth: `key:${secret}` },
      error: { message: 'Server error', http_code: 500 },
    });
    await expect(
      provider(config, logger).inspectAsset({ publicId: 'iaa/a/b/c', resourceType: 'image' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(secret);
  });

  it('deletes best-effort, logging rather than throwing', async () => {
    const logger = makeLogger();
    const destroy = vi
      .spyOn(cloudinary.uploader, 'destroy')
      .mockRejectedValue(new Error('offline'));
    await expect(
      provider(config, logger).destroyAsset({ publicId: 'iaa/a/b/c', resourceType: 'raw' }),
    ).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledWith(
      'iaa/a/b/c',
      expect.objectContaining({ resource_type: 'raw', type: 'authenticated', invalidate: true }),
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('does nothing and reports nothing when Cloudinary is not configured', async () => {
    const resource = vi.spyOn(cloudinary.api, 'resource');
    const destroy = vi.spyOn(cloudinary.uploader, 'destroy');
    const media = provider(unconfigured);
    await expect(media.inspectAsset({ publicId: 'a' })).resolves.toBeNull();
    await expect(media.destroyAsset({ publicId: 'a' })).resolves.toBeUndefined();
    expect(resource).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });
});
