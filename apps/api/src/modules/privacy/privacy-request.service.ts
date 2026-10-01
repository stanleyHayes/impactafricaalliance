import type {
  AnswerValue,
  DonationCurrency,
  FileAnswer,
  FormStep,
  Paginated,
  PrivacyRequestInput,
  UpdatePrivacyRequestInput,
} from '@iaa/shared';
import type { Types } from 'mongoose';
import { inject, injectable } from 'tsyringe';

import { ForbiddenError, NotFoundError } from '../../common/errors.js';
import { paginate } from '../../common/pagination.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';
import { folderOf } from '../forms/draft-files.js';
import { FormSubmissionModel } from '../forms/form-submission.model.js';
import { FormVersionModel } from '../forms/form-version.model.js';
import { FormModel } from '../forms/form.model.js';
import { DonationModel, donationAmountOf, donationCurrencyOf } from '../payments/donation.model.js';
import { SubmissionModel, SubscriberModel } from '../submissions/submission.model.js';

import { PrivacyRequestModel } from './privacy-request.model.js';
import type { PrivacyRequestDocument } from './privacy-request.model.js';
import {
  PrivacyRequestRepository,
  type PrivacyRequestListFilter,
} from './privacy-request.repository.js';

interface PersonalDataExport {
  email: string;
  submissions: Array<{
    type: string;
    status: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
  subscriptions: Array<{
    email: string;
    source?: string;
    consentedAt?: string;
    unsubscribedAt?: string;
  }>;
  donations: Array<{
    reference: string;
    amount: number;
    currency: DonationCurrency;
    status: string;
    createdAt: string;
  }>;
  /**
   * Applications made through the form builder, finished or still in draft.
   * Empty when the caller may not read applications (see `applicationsWithheld`).
   */
  applications: Array<{
    reference?: string;
    form: string;
    status: string;
    answers: Array<{ question: string; value: AnswerValue }>;
    submittedAt?: string;
    createdAt: string;
  }>;
  /**
   * How many applications and drafts were left out because the caller may not
   * read applications, so they know a colleague who can has to export them.
   * Present only when some were.
   */
  applicationsWithheld?: number;
}

/**
 * What the caller may do with applications (plan D2). Editors can handle
 * privacy requests but, by default, cannot read applications, so a privacy
 * export or erasure must not become a way round that.
 */
export interface ApplicationRights {
  /** `applications:read`: the export may include applications and their answers. */
  canReadApplications: boolean;
  /** An administrator, or `applications:update`: an erasure may delete applications. */
  canEraseApplications: boolean;
}

export const ERASURE_NEEDS_APPLICATIONS_ACCESS =
  'This request would erase applications. An administrator, or someone who reviews applications, has to fulfil it.';

interface StoredApplication {
  _id: Types.ObjectId;
  reference?: string;
  formId: Types.ObjectId;
  formVersion: number;
  status: string;
  answers?: { fieldId: string; value: AnswerValue }[];
  submittedAt?: Date | null;
  createdAt: Date;
}

const isFileList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

// Applicant emails are stored lowercased by the model, so an exact match on
// the lowercased address finds them whatever case the request used.
const applicantFilter = (email: string) => ({ 'applicant.email': email.trim().toLowerCase() });

/** Question labels by id, from the version the applicant answered, or the form as it is now. */
const labelsFor = async (applications: StoredApplication[]): Promise<Map<string, string>> => {
  const labels = new Map<string, string>();
  const formIds = [...new Set(applications.map((item) => item.formId.toString()))];
  const [forms, versions] = await Promise.all([
    FormModel.find({ _id: { $in: formIds } })
      .select('title steps')
      .lean<{ _id: Types.ObjectId; title: string; steps?: FormStep[] }[]>()
      .exec(),
    FormVersionModel.find({
      $or: applications.map((item) => ({ formId: item.formId, version: item.formVersion })),
    })
      .select('formId version steps')
      .lean<{ formId: Types.ObjectId; version: number; steps?: FormStep[] }[]>()
      .exec(),
  ]);
  const add = (prefix: string, steps: FormStep[] | undefined) => {
    for (const field of (steps ?? []).flatMap((step) => step.fields)) {
      labels.set(`${prefix}:${field.id}`, field.label);
    }
  };
  for (const form of forms) {
    labels.set(`title:${form._id.toString()}`, form.title);
    add(form._id.toString(), form.steps);
  }
  for (const version of versions) {
    add(`${version.formId.toString()}@${version.version}`, version.steps);
  }
  return labels;
};

@injectable()
export class PrivacyRequestService {
  constructor(
    @inject(PrivacyRequestRepository) private readonly repo: PrivacyRequestRepository,
    @inject(TOKENS.MediaProvider) private readonly media: MediaProvider,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(TOKENS.Config) private readonly config: AppConfig,
  ) {}

  async create(input: PrivacyRequestInput): Promise<PrivacyRequestDocument> {
    return this.repo.create({
      email: input.email,
      type: input.type,
      details: input.details,
      status: 'pending',
    });
  }

  async list(
    filter: PrivacyRequestListFilter,
    page: number,
    pageSize: number,
  ): Promise<Paginated<PrivacyRequestDocument>> {
    const { items, total } = await this.repo.list(filter, page, pageSize);
    return paginate(items, total, page, pageSize);
  }

  async remove(id: string): Promise<void> {
    if (!(await PrivacyRequestModel.findByIdAndDelete(id).exec()))
      throw new NotFoundError('Privacy request');
  }

  /**
   * Change a request's status or notes. Fulfilling a deletion request erases
   * the person's data, and when that includes applications the caller must be
   * allowed to erase them (`rights`). The check comes before anything is
   * deleted, so a refused request erases nothing at all.
   */
  async update(
    id: string,
    input: UpdatePrivacyRequestInput,
    rights: Pick<ApplicationRights, 'canEraseApplications'>,
  ): Promise<PrivacyRequestDocument> {
    const request = await this.repo.findById(id);
    if (!request) {
      throw new NotFoundError('Privacy request');
    }
    const erases =
      input.status === 'fulfilled' && request.status !== 'fulfilled' && request.type === 'delete';
    if (
      erases &&
      !rights.canEraseApplications &&
      (await FormSubmissionModel.exists(applicantFilter(request.email)).exec())
    ) {
      throw new ForbiddenError(ERASURE_NEEDS_APPLICATIONS_ACCESS);
    }

    const changes: Partial<PrivacyRequestDocument> = {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };

    if (input.status === 'fulfilled' && request.status !== 'fulfilled') {
      changes.fulfilledAt = new Date();
      if (request.type === 'delete') {
        await this.erasePersonalData(request.email);
      } else if (request.type === 'access') {
        // Nothing to store; the export is provided to the admin offline.
      }
    }

    const updated = await this.repo.update(id, changes);
    if (!updated) {
      throw new NotFoundError('Privacy request');
    }
    return updated;
  }

  /**
   * Everything held about one address. Applications, with every answer, are
   * included only for a caller who may read applications; anyone else gets a
   * count of what was left out instead (plan D2).
   */
  async exportPersonalData(
    email: string,
    rights: Pick<ApplicationRights, 'canReadApplications'>,
  ): Promise<PersonalDataExport> {
    const [submissions, subscribers, donations, applications, withheld] = await Promise.all([
      SubmissionModel.find({ 'payload.email': email.toLowerCase() })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      SubscriberModel.find({ email: email.toLowerCase() }).lean().exec(),
      DonationModel.find({ donorEmail: email.toLowerCase() }).sort({ createdAt: -1 }).lean().exec(),
      rights.canReadApplications
        ? FormSubmissionModel.find(applicantFilter(email))
            .sort({ createdAt: -1 })
            .select('reference formId formVersion status answers submittedAt createdAt')
            .lean<StoredApplication[]>()
            .exec()
        : Promise.resolve([]),
      rights.canReadApplications
        ? Promise.resolve(0)
        : FormSubmissionModel.countDocuments(applicantFilter(email)).exec(),
    ]);
    const labels = applications.length > 0 ? await labelsFor(applications) : new Map();

    return {
      email,
      submissions: submissions.map((doc) => ({
        type: doc.type,
        status: doc.status,
        payload: doc.payload,
        createdAt: doc.createdAt.toISOString(),
      })),
      subscriptions: subscribers.map((doc) => ({
        email: doc.email,
        source: doc.source,
        consentedAt: doc.consentedAt?.toISOString(),
        unsubscribedAt: doc.unsubscribedAt?.toISOString(),
      })),
      donations: donations.map((doc) => ({
        reference: doc.reference,
        amount: donationAmountOf(doc),
        currency: donationCurrencyOf(doc),
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
      })),
      applications: applications.map((doc) => {
        const formId = doc.formId.toString();
        const label = (fieldId: string): string =>
          labels.get(`${formId}@${doc.formVersion}:${fieldId}`) ??
          labels.get(`${formId}:${fieldId}`) ??
          fieldId;
        return {
          ...(doc.reference ? { reference: doc.reference } : {}),
          form: labels.get(`title:${formId}`) ?? 'A form that has since been removed',
          status: doc.status,
          answers: (doc.answers ?? []).map((answer) => ({
            question: label(answer.fieldId),
            value: answer.value ?? null,
          })),
          ...(doc.submittedAt ? { submittedAt: doc.submittedAt.toISOString() } : {}),
          createdAt: doc.createdAt.toISOString(),
        };
      }),
      ...(withheld > 0 ? { applicationsWithheld: withheld } : {}),
    };
  }

  private async erasePersonalData(email: string): Promise<void> {
    const normalized = email.toLowerCase();
    await this.eraseApplications(email);
    await Promise.all([
      SubmissionModel.deleteMany({ 'payload.email': normalized }).exec(),
      SubscriberModel.deleteMany({ email: normalized }).exec(),
      DonationModel.updateMany(
        { donorEmail: normalized },
        {
          $set: { donorName: '[redacted]', donorEmail: '[redacted]', marketingConsent: false },
        },
      ).exec(),
    ]);
  }

  /**
   * Delete every application and draft made with this address, and their
   * uploaded files: each file the answers name, and then each record's whole
   * folder, which also holds files the answers no longer name (a replaced CV,
   * one refused at submission). The files are removed best-effort: the
   * records go whatever Cloudinary says, and a file left behind is private,
   * reachable only through a signed link nobody can now produce.
   */
  private async eraseApplications(email: string): Promise<void> {
    const filter = applicantFilter(email);
    const applications = await FormSubmissionModel.find(filter)
      .select('formId answers')
      .lean<Pick<StoredApplication, '_id' | 'formId' | 'answers'>[]>()
      .exec();
    if (applications.length === 0) {
      return;
    }
    await FormSubmissionModel.deleteMany({
      _id: { $in: applications.map((item) => item._id) },
    }).exec();
    const files = applications.flatMap((item) =>
      (item.answers ?? []).flatMap((answer) => (isFileList(answer.value) ? answer.value : [])),
    );
    await Promise.all([
      ...files.map((file) =>
        this.bestEffort(file.publicId, () =>
          this.media.destroyAsset({
            publicId: file.publicId,
            ...(file.resourceType ? { resourceType: file.resourceType } : {}),
          }),
        ),
      ),
      ...applications.map((item) => {
        const folder = folderOf(this.config.cloudinary.folder, item);
        return this.bestEffort(folder, () => this.media.destroyByPrefix(folder));
      }),
    ]);
  }

  private async bestEffort(entityId: string, remove: () => Promise<void>): Promise<void> {
    try {
      await remove();
    } catch (err) {
      this.logger.error(
        { err, module: 'privacy', entityId },
        'Failed to delete an applicant file during erasure',
      );
    }
  }
}
