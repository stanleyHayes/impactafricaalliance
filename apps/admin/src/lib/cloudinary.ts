import type { MediaAsset } from '@iaa/shared';

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
export const uploadToCloudinary = async (file: File): Promise<MediaAsset> => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      'Unsupported file type. Please upload JPG, PNG, GIF, WebP, or PDF.',
    );
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
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`,
    { method: 'POST', body: form },
  );
  if (!response.ok) {
    throw new Error('Upload failed. Please try again.');
  }
  const data = (await response.json()) as CloudinaryUploadResponse;
  return {
    url: data.secure_url,
    publicId: data.public_id,
    ...(data.width ? { width: data.width } : {}),
    ...(data.height ? { height: data.height } : {}),
  };
};
