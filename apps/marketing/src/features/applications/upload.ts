import {
  FILE_RESOURCE_TYPES,
  fileAnswerSchema,
  type FileAnswer,
  type FileResourceType,
  type SignedApplicationUpload,
} from '@iaa/shared';

/**
 * Uploading an applicant's file straight to Cloudinary (plan D7).
 *
 * XMLHttpRequest rather than fetch because only XHR reports upload progress,
 * and a CV on a slow mobile connection can take long enough that a spinner
 * with no number looks broken.
 */

/** A running upload: its result, and a way to stop it. */
export interface UploadHandle {
  promise: Promise<FileAnswer>;
  abort: () => void;
}

/** Thrown when the person stops an upload, so callers can tell it from a failure. */
export class UploadCancelledError extends Error {
  constructor() {
    super('Upload cancelled');
    this.name = 'UploadCancelledError';
  }
}

/** The parts of Cloudinary's upload response the flow keeps. */
export interface CloudinaryUploadResult {
  public_id?: unknown;
  secure_url?: unknown;
  original_filename?: unknown;
  format?: unknown;
  bytes?: unknown;
  resource_type?: unknown;
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const extensionOf = (filename: string): string | undefined => {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? undefined : filename.slice(dot + 1).toLowerCase() || undefined;
};

const resourceTypeOf = (value: unknown): FileResourceType | undefined =>
  (FILE_RESOURCE_TYPES as readonly unknown[]).includes(value)
    ? (value as FileResourceType)
    : undefined;

/**
 * Cloudinary's answer as a stored file answer, or null when it does not make
 * one. The name is Cloudinary's record of the original name plus the format
 * it detected; raw files (documents) come back without a format, so the
 * picked file's own name stands in, since the shared check reads the type
 * from the name when no format is given.
 */
export const toFileAnswer = (result: CloudinaryUploadResult, file: File): FileAnswer | null => {
  const originalName = text(result.original_filename);
  const format = text(result.format)?.toLowerCase();
  const candidate = {
    publicId: text(result.public_id),
    url: text(result.secure_url),
    name: originalName && format ? `${originalName}.${format}` : file.name,
    format: format ?? extensionOf(file.name),
    bytes: typeof result.bytes === 'number' ? result.bytes : file.size,
    resourceType: resourceTypeOf(result.resource_type),
  };
  const parsed = fileAnswerSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

/**
 * Cloudinary answers CORS by echoing the Origin while letting the result be
 * cached for weeks without varying on it, and the admin console uploads to
 * the same URL. Tagging the URL with this site's origin keeps the two cache
 * entries apart (the same fix as `lib/cloudinary.ts`); Cloudinary ignores the
 * extra parameter.
 */
export const uploadUrlFor = (uploadUrl: string): string => {
  const url = new URL(uploadUrl);
  url.searchParams.set('_origin', globalThis.location?.origin ?? 'unknown');
  return url.toString();
};

const errorMessageFrom = (xhr: XMLHttpRequest): string => {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: { message?: unknown } };
    const message = text(body.error?.message);
    if (message) {
      return `The upload was refused: ${message}`;
    }
  } catch {
    // Not JSON; fall through to the general message.
  }
  return 'The upload did not finish. Check your connection and try again.';
};

const resultFrom = (xhr: XMLHttpRequest, file: File): FileAnswer => {
  if (xhr.status < 200 || xhr.status >= 300) {
    throw new Error(errorMessageFrom(xhr));
  }
  let body: CloudinaryUploadResult;
  try {
    body = JSON.parse(xhr.responseText) as CloudinaryUploadResult;
  } catch {
    throw new Error('The upload finished but its result could not be read. Try again.');
  }
  const answer = toFileAnswer(body, file);
  if (!answer) {
    throw new Error('The upload finished but its result could not be read. Try again.');
  }
  return answer;
};

/**
 * Post one file with its signed fields and report progress as a fraction
 * from 0 to 1. The signed fields go first and the file last, as Cloudinary
 * expects.
 */
export const uploadFile = (
  signed: SignedApplicationUpload,
  file: File,
  onProgress: (fraction: number) => void,
): UploadHandle => {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<FileAnswer>((resolve, reject) => {
    const body = new FormData();
    Object.entries(signed.fields).forEach(([key, value]) => body.append(key, value));
    body.append('file', file);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(event.loaded / event.total, 1));
      }
    };
    xhr.onload = () => {
      try {
        resolve(resultFrom(xhr, file));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    xhr.onerror = () =>
      reject(new Error('The upload did not finish. Check your connection and try again.'));
    xhr.onabort = () => reject(new UploadCancelledError());

    xhr.open('POST', uploadUrlFor(signed.uploadUrl));
    xhr.send(body);
  });
  return { promise, abort: () => xhr.abort() };
};
