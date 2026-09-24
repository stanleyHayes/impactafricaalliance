import { v2 as cloudinary } from 'cloudinary';
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../config/env.js';

import { CloudinaryMediaProvider } from './media.provider.js';

const config = {
  cloudinary: { cloudName: 'demo', apiKey: 'key', apiSecret: 'test-secret', folder: 'iaa' },
} as AppConfig;
describe('Cloudinary upload signatures', () => {
  it.each(['createSignedUpload', 'createSignedCvUpload'] as const)(
    '%s signs exactly the fields Cloudinary validates',
    (method) => {
      const signed = new CloudinaryMediaProvider(config)[method]();
      expect(signed.signature).toBe(
        cloudinary.utils.api_sign_request(
          {
            timestamp: signed.timestamp,
            folder: signed.folder,
            allowed_formats: signed.allowedFormats,
          },
          'test-secret',
        ),
      );
      expect(signed.maxFileSize).toBe(5 * 1024 * 1024);
      expect(signed.folder).toBe(method === 'createSignedCvUpload' ? 'iaa/cvs' : 'iaa');
    },
  );
});
