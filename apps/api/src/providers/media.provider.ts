import { randomBytes } from 'node:crypto';

import type { SignedApplicationUpload } from '@iaa/shared';
import { v2 as cloudinary } from 'cloudinary';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, ValidationError } from '../common/errors.js';
import type { AppConfig } from '../config/env.js';
import type { AppLogger } from '../config/logger.js';
import { TOKENS } from '../tokens.js';

export const ALLOWED_UPLOAD_FORMATS = 'jpg,png,gif,webp,pdf';
export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const CV_ALLOWED_FORMATS = 'pdf';
export const CV_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * What staff may attach to a project or a task: photos, PDFs and the office
 * formats partners actually send (plan D7).
 */
export const DOCUMENT_ALLOWED_FORMATS =
  'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,csv,ppt,pptx,txt';
/** Advertised to the dashboard, which checks it before uploading; see `sign` for why. */
export const DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface SignedUpload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
}

/** Where one applicant file may go, decided by the forms service. */
export interface ApplicationUploadTarget {
  formId: string;
  /** The draft's own id: each draft gets a folder, which is what the submit check relies on. */
  draftId: string;
  /** The question the file answers; becomes the start of the file's name. */
  fieldId: string;
  /** Extensions the question accepts, such as `['pdf', 'docx']`. */
  formats: readonly string[];
  /** The question's size limit, passed back to the browser to check before uploading. */
  maxBytes: number;
}

/** Enough to find a stored file on Cloudinary again. */
export interface StoredAssetRef {
  publicId: string;
  /** `image` (photos and PDFs), `raw` (other documents) or `video`, from the upload response. */
  resourceType?: string;
  format?: string;
  /** Applicant files are `authenticated`, and that is the default here. */
  type?: 'upload' | 'authenticated' | 'private';
}

/** What Cloudinary says it holds for a file. */
export interface AssetFacts {
  bytes: number;
  format?: string;
  resourceType?: string;
}

/** Abstraction over the media/image host (Cloudinary). */
export interface MediaProvider {
  /** Produce a short-lived signature the admin client uses for a direct upload. */
  createSignedUpload(): SignedUpload;
  /** Produce a short-lived signature for public CV uploads (PDF only). */
  createSignedCvUpload(): SignedUpload;
  /** Staff documents and attachments: office formats as well as images, up to 10 MB. */
  createSignedDocumentUpload(): SignedUpload;
  /**
   * Everything an applicant's browser needs to upload one file into its
   * draft's private folder. Throws 503 when Cloudinary is not configured, as
   * the other signers do.
   */
  createSignedApplicationUpload(target: ApplicationUploadTarget): SignedApplicationUpload;
  /** A signed link to an authenticated file, or null when Cloudinary is not configured. */
  signedDeliveryUrl(asset: StoredAssetRef): string | null;
  /**
   * The stored size and format of a file, or null when Cloudinary is not
   * configured (so tests and local development skip the check). Throws a 400
   * when the file does not exist and a 503 when Cloudinary cannot be asked.
   */
  inspectAsset(asset: StoredAssetRef): Promise<AssetFacts | null>;
  /** Delete a file. Best-effort: logs and carries on when it cannot. */
  destroyAsset(asset: StoredAssetRef): Promise<void>;
}

interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

// Upload endpoint for every kind of file; Cloudinary works out the resource type.
const uploadEndpoint = (cloudName: string): string =>
  `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

// Folder and file names built from ids must stay inside their folder: no
// slashes, no dots, nothing a path could be walked out with.
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SAFE_FORMAT = /^[a-z0-9]{1,10}$/;

// Random part of an applicant file's name: 64 bits, so names cannot be guessed
// from one another.
const RANDOM_NAME_BYTES = 8;

/**
 * The HTTP status of a Cloudinary failure. Read from the error rather than
 * logging it whole: the Admin API's rejection carries the request options,
 * which include the API key and secret.
 */
const cloudinaryStatus = (error: unknown): number | undefined => {
  const inner = (error as { error?: { http_code?: unknown }; http_code?: unknown } | null) ?? {};
  const code = inner.error?.http_code ?? inner.http_code;
  return typeof code === 'number' ? code : undefined;
};

const cloudinaryMessage = (error: unknown): string | undefined => {
  const inner = (error as { error?: { message?: unknown }; message?: unknown } | null) ?? {};
  const message = inner.error?.message ?? inner.message;
  return typeof message === 'string' ? message : undefined;
};

@injectable()
export class CloudinaryMediaProvider implements MediaProvider {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  private credentials(): CloudinaryCredentials | null {
    const { cloudName, apiKey, apiSecret } = this.config.cloudinary;
    return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
  }

  private requireCredentials(): CloudinaryCredentials {
    const credentials = this.credentials();
    if (!credentials) {
      throw new ServiceUnavailableError('Cloudinary is not configured');
    }
    return credentials;
  }

  // Per-call credentials for the SDK, so nothing depends on global SDK state.
  private auth({ cloudName, apiKey, apiSecret }: CloudinaryCredentials) {
    return { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
  }

  private sign(params: {
    timestamp: number;
    folder: string;
    allowed_formats: string;
    max_file_size: number;
  }): SignedUpload {
    const { cloudName, apiKey, apiSecret } = this.requireCredentials();
    // max_file_size is not a signed Upload API parameter. Cloudinary ignores it
    // when validating, so including it in the signature causes a 401.
    const { max_file_size: maxFileSize, ...signedParams } = params;
    const signature = cloudinary.utils.api_sign_request(signedParams, apiSecret);
    return {
      timestamp: params.timestamp,
      signature,
      apiKey,
      cloudName,
      folder: params.folder,
      allowedFormats: params.allowed_formats,
      maxFileSize,
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

  createSignedDocumentUpload(): SignedUpload {
    const timestamp = Math.floor(Date.now() / 1000);
    return this.sign({
      timestamp,
      // Kept apart from photos so the documents can be found, and cleaned up,
      // without sifting through the site's images.
      folder: `${this.config.cloudinary.folder}/documents`,
      allowed_formats: DOCUMENT_ALLOWED_FORMATS,
      max_file_size: DOCUMENT_MAX_FILE_SIZE,
    });
  }

  /**
   * Sign one applicant upload (plan D7).
   *
   * Every value the browser posts, apart from the file, the API key and the
   * signature itself, is covered by the signature, so none can be changed:
   *
   * - `folder` is the draft's own folder, which the submit check relies on;
   * - `public_id` is chosen here, so the browser cannot name or overwrite
   *   another file;
   * - `type: 'authenticated'` keeps the file off public URLs;
   * - `allowed_formats` is the question's list;
   * - `overwrite: 'false'` stops the signature, which Cloudinary honours for
   *   an hour, being reused to swap the file after it has been checked.
   *
   * Size is not signable (see `sign`); the service checks the declared size
   * before signing and the stored size with `inspectAsset` on submit.
   */
  createSignedApplicationUpload(target: ApplicationUploadTarget): SignedApplicationUpload {
    const { cloudName, apiKey, apiSecret } = this.requireCredentials();
    const segments = [target.formId, target.draftId, target.fieldId];
    if (
      !segments.every((segment) => SAFE_SEGMENT.test(segment)) ||
      target.formats.length === 0 ||
      !target.formats.every((format) => SAFE_FORMAT.test(format))
    ) {
      throw new ValidationError('This file cannot be uploaded here');
    }
    const folder = `${this.config.cloudinary.folder}/applications/${target.formId}/${target.draftId}`;
    const name = `${target.fieldId}-${randomBytes(RANDOM_NAME_BYTES).toString('hex')}`;
    const signed = {
      allowed_formats: target.formats.join(','),
      folder,
      overwrite: 'false',
      public_id: name,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: 'authenticated',
    };
    const signature = cloudinary.utils.api_sign_request(signed, apiSecret);
    return {
      uploadUrl: uploadEndpoint(cloudName),
      fields: { ...signed, api_key: apiKey, signature },
      // The id Cloudinary will report back: the folder, then the name.
      publicId: `${folder}/${name}`,
      folder,
      maxBytes: target.maxBytes,
      allowedFormats: [...target.formats],
    };
  }

  /**
   * A signed link to a file stored as `authenticated`. The link is built
   * locally, with no call to Cloudinary. Its signature does not expire, so
   * links are generated when a record is read and never stored.
   */
  signedDeliveryUrl(asset: StoredAssetRef): string | null {
    const credentials = this.credentials();
    if (!credentials) {
      return null;
    }
    const resourceType = asset.resourceType ?? 'image';
    return cloudinary.url(asset.publicId, {
      ...this.auth(credentials),
      secure: true,
      sign_url: true,
      // Otherwise the SDK appends its own tracking query to every link.
      urlAnalytics: false,
      type: asset.type ?? 'authenticated',
      resource_type: resourceType,
      // A raw file's extension is already part of its id; adding the format
      // again would point at a file that does not exist.
      ...(resourceType !== 'raw' && asset.format ? { format: asset.format } : {}),
    });
  }

  /**
   * Ask Cloudinary what it holds for a file (plan D7): the check that an
   * applicant's file really is the size and type they said.
   *
   * When the upload response did not say which resource type the file is,
   * both of the types an applicant file can be are tried.
   */
  async inspectAsset(asset: StoredAssetRef): Promise<AssetFacts | null> {
    const credentials = this.credentials();
    if (!credentials) {
      return null;
    }
    const candidates = asset.resourceType ? [asset.resourceType] : ['image', 'raw'];
    for (const resourceType of candidates) {
      const facts = await this.fetchFacts(credentials, asset, resourceType);
      if (facts) {
        return facts;
      }
    }
    throw new ValidationError('An uploaded file could not be found. Upload it again.');
  }

  // The facts for one resource type, or null when Cloudinary has no such file.
  private async fetchFacts(
    credentials: CloudinaryCredentials,
    asset: StoredAssetRef,
    resourceType: string,
  ): Promise<AssetFacts | null> {
    try {
      const result = (await cloudinary.api.resource(asset.publicId, {
        ...this.auth(credentials),
        resource_type: resourceType,
        type: asset.type ?? 'authenticated',
      })) as { bytes?: unknown; format?: unknown; resource_type?: unknown };
      return {
        bytes: typeof result.bytes === 'number' ? result.bytes : 0,
        ...(typeof result.format === 'string' ? { format: result.format } : {}),
        resourceType:
          typeof result.resource_type === 'string' ? result.resource_type : resourceType,
      };
    } catch (error) {
      const status = cloudinaryStatus(error);
      if (status === 404) {
        return null;
      }
      this.logger.error(
        { status, message: cloudinaryMessage(error), publicId: asset.publicId },
        'Could not inspect a Cloudinary file',
      );
      throw new ServiceUnavailableError('Could not check an uploaded file. Try again in a moment.');
    }
  }

  async destroyAsset(asset: StoredAssetRef): Promise<void> {
    const credentials = this.credentials();
    if (!credentials) {
      return;
    }
    const options = {
      ...this.auth(credentials),
      resource_type: asset.resourceType ?? 'image',
      type: asset.type ?? 'authenticated',
      invalidate: true,
    };
    try {
      await cloudinary.uploader.destroy(asset.publicId, options);
    } catch (error) {
      this.logger.warn(
        {
          status: cloudinaryStatus(error),
          message: cloudinaryMessage(error),
          publicId: asset.publicId,
        },
        'Could not delete a Cloudinary file',
      );
    }
  }
}
