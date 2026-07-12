import { v2 as cloudinary } from 'cloudinary';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError } from '../common/errors.js';
import type { AppConfig } from '../config/env.js';
import { TOKENS } from '../tokens.js';

export const ALLOWED_UPLOAD_FORMATS = 'jpg,png,gif,webp,pdf';
export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const CV_ALLOWED_FORMATS = 'pdf';
export const CV_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface SignedUpload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
}

/** Abstraction over the media/image host (Cloudinary). */
export interface MediaProvider {
  /** Produce a short-lived signature the admin client uses for a direct upload. */
  createSignedUpload(): SignedUpload;
  /** Produce a short-lived signature for public CV uploads (PDF only). */
  createSignedCvUpload(): SignedUpload;
}

@injectable()
export class CloudinaryMediaProvider implements MediaProvider {
  constructor(@inject(TOKENS.Config) private readonly config: AppConfig) {}

  private sign(params: {
    timestamp: number;
    folder: string;
    allowed_formats: string;
    max_file_size: number;
  }): SignedUpload {
    const { cloudName, apiKey, apiSecret, folder } = this.config.cloudinary;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableError('Cloudinary is not configured');
    }
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);
    return {
      timestamp: params.timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
      allowedFormats: params.allowed_formats,
      maxFileSize: params.max_file_size,
    };
  }

  createSignedUpload(): SignedUpload {
    const timestamp = Math.floor(Date.now() / 1000);
    return this.sign({
      timestamp,
      folder: this.config.cloudinary.folder,
      allowed_formats: ALLOWED_UPLOAD_FORMATS,
      max_file_size: MAX_UPLOAD_FILE_SIZE,
    });
  }

  createSignedCvUpload(): SignedUpload {
    const timestamp = Math.floor(Date.now() / 1000);
    return this.sign({
      timestamp,
      folder: `${this.config.cloudinary.folder}/cvs`,
      allowed_formats: CV_ALLOWED_FORMATS,
      max_file_size: CV_MAX_FILE_SIZE,
    });
  }
}
