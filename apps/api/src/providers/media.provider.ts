import { v2 as cloudinary } from 'cloudinary';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError } from '../common/errors.js';
import type { AppConfig } from '../config/env.js';
import { TOKENS } from '../tokens.js';

export interface SignedUpload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/** Abstraction over the media/image host (Cloudinary). */
export interface MediaProvider {
  /** Produce a short-lived signature the admin client uses for a direct upload. */
  createSignedUpload(): SignedUpload;
}

@injectable()
export class CloudinaryMediaProvider implements MediaProvider {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  createSignedUpload(): SignedUpload {
    const { cloudName, apiKey, apiSecret, folder } = this.config.cloudinary;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableError('Cloudinary is not configured');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);
    return { timestamp, signature, apiKey, cloudName, folder };
  }
}
