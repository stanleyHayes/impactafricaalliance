import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError, ValidationError } from '../common/errors.js';
import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../config/logger.js';

import { CloudinaryMediaProvider } from './media.provider.js';

/**
 * Finding and deleting a whole folder of applicant files: how files nothing
 * points at any more are cleared (`modules/forms/draft-files.ts`). Cloudinary
 * is never called; its Admin API is replaced with spies.
 */

const config = {
  cloudinary: { cloudName: 'demo', apiKey: 'key', apiSecret: 'test-secret', folder: 'iaa' },
} as AppConfig;
const unconfigured = { cloudinary: { folder: 'iaa' } } as AppConfig;

const makeLogger = () => ({ error: vi.fn(), warn: vi.fn(), debug: vi.fn() });
const provider = (appConfig: AppConfig = config, logger = makeLogger()) =>
  new CloudinaryMediaProvider(appConfig, logger as unknown as AppLogger);

const folder = 'iaa/applications/64b7f0c2a1b2c3d4e5f60718/64b7f0c2a1b2c3d4e5f60719/';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listing a folder', () => {
  it('asks for authenticated photos and documents, page by page', async () => {
    const resources = vi
      .spyOn(cloudinary.api, 'resources')
      .mockResolvedValueOnce({
        resources: [{ public_id: `${folder}cv-1`, format: 'pdf' }],
        next_cursor: 'more',
      } as never)
      .mockResolvedValueOnce({ resources: [{ public_id: `${folder}cv-2` }] } as never)
      .mockResolvedValueOnce({ resources: [{ public_id: `${folder}letter-1` }] } as never);

    const found = await provider().listAssetsByPrefix(folder);

    expect(found).toEqual([
      { publicId: `${folder}cv-1`, resourceType: 'image', type: 'authenticated', format: 'pdf' },
      { publicId: `${folder}cv-2`, resourceType: 'image', type: 'authenticated' },
      { publicId: `${folder}letter-1`, resourceType: 'raw', type: 'authenticated' },
    ]);
    expect(resources).toHaveBeenCalledTimes(3);
    expect(resources).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prefix: folder,
        type: 'authenticated',
        resource_type: 'image',
        next_cursor: 'more',
      }),
    );
    expect(resources).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ resource_type: 'raw', prefix: folder }),
    );
  });

  it('says so, without the credentials, when Cloudinary cannot be asked', async () => {
    const logger = makeLogger();
    vi.spyOn(cloudinary.api, 'resources').mockRejectedValue({
      error: { http_code: 420, message: 'Rate limit' },
      request_options: { api_secret: 'test-secret' },
    });

    await expect(provider(config, logger).listAssetsByPrefix(folder)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('test-secret');
  });

  it('lists nothing when Cloudinary is not configured', async () => {
    const resources = vi.spyOn(cloudinary.api, 'resources');
    expect(await provider(unconfigured).listAssetsByPrefix(folder)).toEqual([]);
    expect(resources).not.toHaveBeenCalled();
  });
});

describe('deleting a folder', () => {
  it('deletes authenticated photos and documents, repeating while Cloudinary stops short', async () => {
    const remove = vi
      .spyOn(cloudinary.api, 'delete_resources_by_prefix')
      .mockResolvedValueOnce({ deleted: {}, partial: true } as never)
      .mockResolvedValueOnce({ deleted: {}, partial: false } as never)
      .mockResolvedValueOnce({ deleted: {} } as never);

    await provider().destroyByPrefix(folder);

    expect(remove).toHaveBeenCalledTimes(3);
    expect(remove).toHaveBeenNthCalledWith(
      1,
      folder,
      expect.objectContaining({ resource_type: 'image', type: 'authenticated', invalidate: true }),
    );
    expect(remove).toHaveBeenNthCalledWith(
      3,
      folder,
      expect.objectContaining({ resource_type: 'raw', type: 'authenticated' }),
    );
  });

  it('throws, so the caller can keep the record and try again', async () => {
    vi.spyOn(cloudinary.api, 'delete_resources_by_prefix').mockRejectedValue({
      error: { http_code: 500, message: 'Down' },
    });
    await expect(provider().destroyByPrefix(folder)).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  it('does nothing when Cloudinary is not configured', async () => {
    const remove = vi.spyOn(cloudinary.api, 'delete_resources_by_prefix');
    await provider(unconfigured).destroyByPrefix(folder);
    expect(remove).not.toHaveBeenCalled();
  });

  it.each(['', 'iaa/', 'iaa/applications/', `${folder.slice(0, -1)}`])(
    'refuses a prefix as broad as "%s"',
    async (prefix) => {
      const remove = vi.spyOn(cloudinary.api, 'delete_resources_by_prefix');
      await expect(provider().destroyByPrefix(prefix)).rejects.toBeInstanceOf(ValidationError);
      await expect(provider().listAssetsByPrefix(prefix)).rejects.toBeInstanceOf(ValidationError);
      expect(remove).not.toHaveBeenCalled();
    },
  );
});
