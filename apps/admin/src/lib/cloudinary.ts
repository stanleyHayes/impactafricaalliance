import { mediaAssetSchema, type MediaAsset } from '@iaa/shared';

import { api } from './api-client';

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
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

/**
 * Upload a file directly to Cloudinary using a server-issued signature, so the
 * API secret never reaches the browser. Returns a MediaAsset for the form.
 */
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

export const uploadToCloudinary = async (file: File): Promise<MediaAsset> => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload JPG, PNG, GIF, WebP, or PDF.');
  }

  const signature = await api.post<SignedUpload>('/admin/media/sign', {});

  if (file.size > signature.maxFileSize) {
    throw new Error(
      `File is too large. Maximum size is ${Math.round(signature.maxFileSize / 1024 / 1024)} MB.`,
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('allowed_formats', signature.allowedFormats);
  form.append('max_file_size', String(signature.maxFileSize));

  const response = await fetch(
    uploadUrl(signature.cloudName),
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }
  const data = (await response.json()) as CloudinaryUploadResponse;
  return mediaAssetSchema.parse({
    url: data.secure_url,
    publicId: data.public_id,
    ...(data.width ? { width: data.width } : {}),
    ...(data.height ? { height: data.height } : {}),
  });
};
