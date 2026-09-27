import {
  FILE_RESOURCE_TYPES,
  fileAssetSchema,
  mediaAssetSchema,
  type FileAsset,
  type FileResourceType,
  type MediaAsset,
  type MediaFolder,
} from '@iaa/shared';

import { api } from './api-client';
import { registerMediaItem } from './media-library';

interface SignedUpload {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  allowedFormats: string;
  maxFileSize: number;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  resource_type?: string;
  original_filename?: string;
}

/**
 * Which signing profile an upload uses.
 *
 * - `image`: pictures and PDFs up to 5 MB, for content that appears on the
 *   site. The original and still the default.
 * - `document`: office files as well, up to 10 MB, for task attachments and
 *   project documents that stay inside the dashboard.
 */
export type UploadProfile = 'image' | 'document';

export interface UploadOptions {
  /**
   * Add the upload to the media library so it can be picked again. On by
   * default, which is how every upload behaved before there were options.
   * Attachments and documents turn it off: they belong to one record, and a
   * library full of meeting minutes makes the pictures harder to find.
   */
  register?: boolean;
  profile?: UploadProfile;
}

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

/**
 * Extensions the document profile accepts. The API signs the same list
 * (`POST /admin/media/sign-document`), so anything else would be refused by
 * Cloudinary after a wasted upload.
 */
export const DOCUMENT_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'ppt',
  'pptx',
  'txt',
] as const;

/** Largest document the document profile accepts: 10 MB. */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The `accept` attribute for a document picker. Extensions rather than MIME
 * types, because browsers disagree about the type of an office file (a CSV is
 * `text/csv` on one machine and `application/vnd.ms-excel` on the next) but
 * all of them understand `.csv`.
 */
export const DOCUMENT_ACCEPT = DOCUMENT_FORMATS.map((format) => `.${format}`).join(',');

const DOCUMENT_EXTENSIONS = new Set<string>(DOCUMENT_FORMATS);

const SIGN_PATHS: Record<UploadProfile, string> = {
  image: '/admin/media/sign',
  document: '/admin/media/sign-document',
};

const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
};

const megabytes = (bytes: number): number => Math.round(bytes / 1024 / 1024);

const tooLarge = (maxBytes: number): Error =>
  new Error(`File is too large. Maximum size is ${megabytes(maxBytes)} MB.`);

/**
 * Refuses a file before asking for a signature, so an obviously wrong file
 * costs nothing and says why at once.
 */
const checkFile = (file: File, profile: UploadProfile): void => {
  if (profile === 'image') {
    if (!IMAGE_TYPES.has(file.type)) {
      throw new Error('Unsupported file type. Please upload JPG, PNG, GIF, WebP, or PDF.');
    }
    return;
  }
  // By extension, for the reason given on DOCUMENT_ACCEPT.
  if (!DOCUMENT_EXTENSIONS.has(fileExtension(file.name))) {
    throw new Error(
      'Unsupported file type. Please upload a PDF, Word, Excel, PowerPoint, CSV or text file, or an image.',
    );
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw tooLarge(DOCUMENT_MAX_BYTES);
  }
};

/**
 * Cloudinary answers CORS by echoing the request Origin, but its response
 * carries `Vary: Accept-Encoding` — with no `Origin` — alongside
 * `Access-Control-Max-Age: 1728000` (20 days). A cached CORS result for this
 * URL is therefore reusable across origins, and the public site and the admin
 * console both upload to it. Whichever origin uploads first can poison the
 * other for weeks with `Access-Control-Allow-Origin` naming the wrong host.
 *
 * Tagging the URL with the calling origin keeps the cache entries distinct.
 * Cloudinary ignores unknown query parameters, so this changes nothing server
 * side.
 */
const uploadUrl = (cloudName: string): string => {
  const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
  url.searchParams.set('_origin', globalThis.location?.origin ?? 'unknown');
  return url.toString();
};

const sendToCloudinary = async (
  file: File,
  signature: SignedUpload,
): Promise<CloudinaryUploadResponse> => {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('allowed_formats', signature.allowedFormats);

  const response = await fetch(uploadUrl(signature.cloudName), { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }
  return (await response.json()) as CloudinaryUploadResponse;
};

const dimensions = (data: CloudinaryUploadResponse): Pick<MediaAsset, 'width' | 'height'> => ({
  ...(data.width ? { width: data.width } : {}),
  ...(data.height ? { height: data.height } : {}),
});

const isResourceType = (value: string | undefined): value is FileResourceType =>
  (FILE_RESOURCE_TYPES as readonly (string | undefined)[]).includes(value);

/**
 * A stored document with what its list row needs. Cloudinary leaves `format`
 * off documents it stores as raw files, so the extension stands in for it.
 */
const toFileAsset = (data: CloudinaryUploadResponse, file: File): FileAsset => {
  const format = data.format ?? fileExtension(file.name);
  // The schema caps the name at 200 characters; a longer one is cut rather
  // than failing an upload that has already succeeded.
  const originalFilename = (file.name || data.original_filename || '').slice(0, 200);
  return fileAssetSchema.parse({
    url: data.secure_url,
    publicId: data.public_id,
    ...dimensions(data),
    ...(format ? { format } : {}),
    bytes: data.bytes ?? file.size,
    ...(isResourceType(data.resource_type) ? { resourceType: data.resource_type } : {}),
    ...(originalFilename ? { originalFilename } : {}),
  });
};

/**
 * Upload a file directly to Cloudinary using a server-issued signature, so the
 * API secret never reaches the browser.
 *
 * The image profile returns a MediaAsset, exactly as before options existed.
 * The document profile returns a FileAsset, which adds the format, size, type
 * and original name a document list shows.
 */
export async function uploadToCloudinary(
  file: File,
  folder?: MediaFolder,
  options?: UploadOptions & { profile?: 'image' },
): Promise<MediaAsset>;
export async function uploadToCloudinary(
  file: File,
  folder: MediaFolder | undefined,
  options: UploadOptions & { profile: 'document' },
): Promise<FileAsset>;
export async function uploadToCloudinary(
  file: File,
  /** Which shelf of the media library this upload belongs on. */
  folder: MediaFolder = 'site',
  { register = true, profile = 'image' }: UploadOptions = {},
): Promise<MediaAsset | FileAsset> {
  checkFile(file, profile);

  const signature = await api.post<SignedUpload>(SIGN_PATHS[profile], {});
  if (file.size > signature.maxFileSize) {
    throw tooLarge(signature.maxFileSize);
  }

  const data = await sendToCloudinary(file, signature);
  const asset =
    profile === 'document'
      ? toFileAsset(data, file)
      : mediaAssetSchema.parse({
          url: data.secure_url,
          publicId: data.public_id,
          ...dimensions(data),
        });

  if (register) {
    // Joining the library means the next place that needs this file can reuse
    // it instead of uploading a second copy.
    await registerMediaItem({
      url: asset.url,
      publicId: asset.publicId,
      filename: file.name || data.original_filename || asset.publicId,
      folder,
      tags: [],
      ...dimensions(data),
      ...(data.bytes ? { bytes: data.bytes } : {}),
      ...(data.format ? { format: data.format } : {}),
    });
  }

  return asset;
}
