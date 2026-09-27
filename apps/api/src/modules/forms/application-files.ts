import {
  acceptedFormatsFor,
  FILE_PUBLIC_ID_PATTERN,
  maxFileBytesFor,
  type FileAnswer,
  type FormField,
} from '@iaa/shared';

import type { AssetFacts } from '../../providers/media.provider.js';

/**
 * Checks on the files in an application (plan D7).
 *
 * The browser uploads straight to Cloudinary and then tells us what it
 * uploaded, so nothing in a file answer is trusted until it has been checked
 * against the draft it belongs to, and, where Cloudinary can be asked, against
 * what Cloudinary actually holds.
 */

/** Where a draft's files live, and whose account they are in. */
export interface DraftFileScope {
  /** The Cloudinary root folder the media provider signs uploads into. */
  rootFolder: string;
  /** Null when Cloudinary is not configured, as in tests and local development. */
  cloudName?: string | null;
  formId: string;
  draftId: string;
}

const CLOUDINARY_HOST = 'res.cloudinary.com';

/**
 * The folder every file of one draft must sit in, with its trailing slash so
 * `…/draft-1` cannot pass for `…/draft-10`.
 */
export const draftFolderPrefix = ({ rootFolder, formId, draftId }: DraftFileScope): string =>
  `${rootFolder.replace(/\/+$/, '')}/applications/${formId}/${draftId}/`;

const linkProblem = (
  url: string,
  publicId: string,
  cloudName: string | null | undefined,
): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== CLOUDINARY_HOST) {
    return true;
  }
  // Cloudinary puts the account name first in the path. Checked when it is
  // known, so a file in someone else's Cloudinary account cannot pass.
  if (cloudName && parsed.pathname.split('/')[1] !== cloudName) {
    return true;
  }
  // The link must be to the file the id names. Otherwise a checked id could
  // carry a link to any other file in the account, which is what a reviewer
  // would open whenever a signed link cannot be made. Ids never need
  // escaping (`FILE_PUBLIC_ID_PATTERN`), so the path holds them as they are.
  return !parsed.pathname.includes(`/${publicId}`);
};

/**
 * Why a file answer cannot be accepted for this draft, or null when its
 * location is sound.
 *
 * The id must sit inside the draft's own folder: the upload signature pins
 * uploads there, so an id anywhere else is a file this draft never uploaded,
 * such as another applicant's. The shared schema already refuses `.` and `..`
 * segments, so a prefix check cannot be walked out of the folder. The link
 * must be a Cloudinary link in our account to that same file; it is replaced
 * with a signed one when staff read the application, but it is still what the
 * applicant sent.
 */
export const fileLocationProblem = (file: FileAnswer, scope: DraftFileScope): string | null => {
  const prefix = draftFolderPrefix(scope);
  // The pattern is checked again here, not only in the shared schema, because
  // a prefix check is only sound when no segment can be `..`.
  if (
    !FILE_PUBLIC_ID_PATTERN.test(file.publicId) ||
    !file.publicId.startsWith(prefix) ||
    file.publicId.length === prefix.length
  ) {
    return `Upload "${file.name}" again.`;
  }
  if (linkProblem(file.url, file.publicId, scope.cloudName)) {
    return `Upload "${file.name}" again.`;
  }
  return null;
};

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
};

/**
 * Why what Cloudinary holds does not fit the question, or null when it does.
 * The applicant's own claims about size and type were checked by
 * `validateAnswers`; this checks the stored file, which is the one that
 * counts.
 */
export const storedFileProblem = (
  field: Pick<FormField, 'validation'>,
  file: FileAnswer,
  facts: AssetFacts,
): string | null => {
  const maxBytes = maxFileBytesFor(field);
  if (facts.bytes > maxBytes) {
    return `"${file.name}" is larger than ${maxBytes / (1024 * 1024)} MB.`;
  }
  // A raw upload named by us has no extension in its id, so Cloudinary may
  // not report a format; the name the applicant chose is the fallback.
  const format = (facts.format ?? file.format ?? extensionOf(file.name)).toLowerCase();
  if (!acceptedFormatsFor(field).includes(format)) {
    return `"${file.name}" is not a type this question accepts.`;
  }
  return null;
};

/** A file answer updated with what Cloudinary says it holds. */
export const withStoredFacts = (file: FileAnswer, facts: AssetFacts): FileAnswer => ({
  ...file,
  bytes: facts.bytes,
  ...(facts.format ? { format: facts.format } : {}),
  ...(facts.resourceType === 'image' ||
  facts.resourceType === 'raw' ||
  facts.resourceType === 'video'
    ? { resourceType: facts.resourceType }
    : {}),
});
