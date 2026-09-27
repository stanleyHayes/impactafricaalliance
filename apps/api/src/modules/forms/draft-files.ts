import type { FileAnswer } from '@iaa/shared';
import type { Types } from 'mongoose';
import type { DependencyContainer } from 'tsyringe';

import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';

import { draftFolderPrefix } from './application-files.js';
import { FormSubmissionModel } from './form-submission.model.js';

/**
 * Applicant files that nothing points at any more (plan D7, D8 and the spec's
 * privacy goals).
 *
 * The browser uploads straight into a draft's own Cloudinary folder, so the
 * folder can hold files the answers no longer use: a CV replaced by a newer
 * one, a file on a question the applicant then hid, one refused at
 * submission. Left alone they outlive the application, and a privacy erasure,
 * which finds files through the answers, could never reach them. So:
 *
 * - on submission, the files the submitted answers do not use are deleted;
 * - an expired draft is deleted by the hourly sweep here, folder first, rather
 *   than by MongoDB's TTL monitor, which would strand its files;
 * - erasure deletes each application's whole folder (`privacy-request.service`).
 */

/** How many uploads a draft remembers being signed; far more than any form asks for. */
export const MAX_SIGNED_UPLOADS = 50;

/** Expired drafts handled in one run, so a backlog cannot outlast the request. */
export const DRAFT_SWEEP_BATCH = 100;

export interface DraftFileDeps {
  media: MediaProvider;
  logger: AppLogger;
  /** The Cloudinary root folder uploads are signed into. */
  rootFolder: string;
}

/** Enough of a draft to find its folder and say whether it may hold files. */
export interface DraftFolderSource {
  _id: Types.ObjectId;
  formId: Types.ObjectId;
  signedUploads?: readonly string[];
  answers?: readonly { value?: unknown }[];
}

const isFileList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

/** Every file id a set of answers points at. */
export const referencedFileIds = (answers: readonly { value?: unknown }[]): Set<string> =>
  new Set(
    answers.flatMap((answer) =>
      isFileList(answer.value) ? answer.value.map((file) => file.publicId) : [],
    ),
  );

/** The draft's own folder, with its trailing slash. */
export const folderOf = (rootFolder: string, draft: DraftFolderSource): string =>
  draftFolderPrefix({
    rootFolder,
    formId: draft.formId.toString(),
    draftId: draft._id.toString(),
  });

/**
 * Whether a draft's folder may hold anything: it was signed an upload, or an
 * answer names a file. Drafts that never touched a file cost no Cloudinary
 * call, which matters because the Admin API is limited per hour.
 */
export const mayHoldFiles = (draft: DraftFolderSource): boolean =>
  (draft.signedUploads?.length ?? 0) > 0 || referencedFileIds(draft.answers ?? []).size > 0;

/**
 * After a successful submission, delete the files in the draft's folder that
 * the submitted answers do not use. Best-effort: the application is already
 * safe, so a failure is logged and the submission goes on. Cloudinary is only
 * asked when an upload was signed that the answers do not use, so an ordinary
 * submission makes no extra call. Returns how many files were deleted.
 */
export const discardUnusedDraftFiles = async (
  deps: DraftFileDeps,
  draft: DraftFolderSource,
  submitted: readonly { value?: unknown }[],
): Promise<number> => {
  const used = referencedFileIds(submitted);
  if (!(draft.signedUploads ?? []).some((publicId) => !used.has(publicId))) {
    return 0;
  }
  try {
    const stored = await deps.media.listAssetsByPrefix(folderOf(deps.rootFolder, draft));
    const unused = stored.filter((asset) => !used.has(asset.publicId));
    await Promise.all(unused.map((asset) => deps.media.destroyAsset(asset)));
    return unused.length;
  } catch (err) {
    deps.logger.error(
      { err, module: 'forms', entityId: draft._id.toString() },
      'Failed to remove files a submitted application does not use',
    );
    return 0;
  }
};

export interface DraftSweepRun {
  /** Expired drafts deleted, with their files. */
  removed: number;
  /** Expired drafts kept because their files could not be deleted; tried again next run. */
  kept: number;
}

/**
 * Delete drafts past their expiry, each folder of files before its record.
 * A draft whose files cannot be deleted is kept for the next run: without
 * the record nothing would lead back to its folder. The TTL index is only the
 * backstop, a week later.
 */
export const sweepExpiredDrafts = async (
  deps: DraftFileDeps,
  now: Date = new Date(),
): Promise<DraftSweepRun> => {
  const expired = await FormSubmissionModel.find({
    status: 'draft',
    draftExpiresAt: { $lte: now },
  })
    .select('formId signedUploads answers')
    .sort({ draftExpiresAt: 1 })
    .limit(DRAFT_SWEEP_BATCH)
    .lean<DraftFolderSource[]>()
    .exec();
  const removable: Types.ObjectId[] = [];
  let kept = 0;
  for (const draft of expired) {
    if (mayHoldFiles(draft)) {
      try {
        await deps.media.destroyByPrefix(folderOf(deps.rootFolder, draft));
      } catch (err) {
        deps.logger.warn(
          { err, module: 'forms', entityId: draft._id.toString() },
          'Kept an expired draft because its files could not be deleted',
        );
        kept += 1;
        continue;
      }
    }
    removable.push(draft._id);
  }
  if (removable.length > 0) {
    // Still expired and still a draft: a draft cannot be saved once expired,
    // but the filter says so rather than relying on it.
    await FormSubmissionModel.deleteMany({
      _id: { $in: removable },
      status: 'draft',
      draftExpiresAt: { $lte: now },
    }).exec();
  }
  return { removed: removable.length, kept };
};

/** The sweep as the scheduled run calls it, with its dependencies from the container. */
export const runDraftSweep = async (
  container: DependencyContainer,
  logger: AppLogger,
): Promise<DraftSweepRun> =>
  sweepExpiredDrafts({
    media: container.resolve<MediaProvider>(TOKENS.MediaProvider),
    logger,
    rootFolder: container.resolve<AppConfig>(TOKENS.Config).cloudinary.folder,
  });
