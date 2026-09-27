import {
  acceptedFormatsFor,
  answersToMap,
  applicantFromAnswers,
  CONSENT_VERSION,
  DRAFT_RETENTION_DAYS,
  isAcceptedFilename,
  maxFileBytesFor,
  pruneHiddenAnswers,
  validateAnswers,
  type AnswerProblem,
  type ApplicantDraft,
  type ApplicantIdentity,
  type DraftCreateInput,
  type DraftSaveInput,
  type DraftSession,
  type DraftSubmitInput,
  type FileAnswer,
  type FormAnswer,
  type FormField,
  type FormStep,
  type FormWindowState,
  type PublicForm,
  type ResumeLinkInput,
  type SignedApplicationUpload,
  type SubmissionReceipt,
  type UploadSignInput,
} from '@iaa/shared';
import { inject, injectable } from 'tsyringe';

import { escapeHtml, emailLayout, textToEmailHtml } from '../../common/email-html.js';
import { NotFoundError, ServiceUnavailableError, ValidationError } from '../../common/errors.js';
import { verifyPreviewToken } from '../../common/preview-token.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import type { EmailProvider } from '../../providers/email.provider.js';
import type { AssetFacts, MediaProvider } from '../../providers/media.provider.js';
import { TOKENS } from '../../tokens.js';
import { AuditService } from '../audit/audit.service.js';

import {
  fileLocationProblem,
  storedFileProblem,
  withStoredFacts,
  type DraftFileScope,
} from './application-files.js';
import { withUniqueReference } from './application-reference.js';
import {
  draftExpiry,
  hashDraftToken,
  isDraftTokenShape,
  MAX_DRAFT_TOKENS,
  newDraftToken,
} from './draft-token.js';
import { answerProblemsError, draftNotFound, FormUnavailableError } from './form-errors.js';
import {
  publicWindow,
  toApplicantDraft,
  toPublicForm,
  type StoredForm,
  type StoredSubmission,
} from './form-mappers.js';
import { FormSubmissionModel } from './form-submission.model.js';
import { FormModel } from './form.model.js';

const CLOSED_MESSAGES: Record<Exclude<FormWindowState, 'open'>, string> = {
  'not-yet-open': 'This form is not open for applications yet.',
  closed: 'This form has closed and is no longer taking applications.',
};

const allFields = (steps: readonly FormStep[]): FormField[] => steps.flatMap((step) => step.fields);

/**
 * Only answers to questions the form has. Hidden questions keep their
 * answers while the applicant is still working, so changing an earlier answer
 * back brings them back; `pruneHiddenAnswers` drops them on submit.
 */
export const knownAnswers = (
  steps: readonly FormStep[],
  answers: readonly FormAnswer[],
): FormAnswer[] => {
  const ids = new Set(allFields(steps).map((field) => field.id));
  return answers.filter((answer) => ids.has(answer.fieldId));
};

/** The saved answers with the ones sent now laid over them, question by question. */
export const mergeAnswers = (
  stored: readonly FormAnswer[],
  posted: readonly FormAnswer[],
): FormAnswer[] =>
  Object.entries({ ...answersToMap(stored), ...answersToMap(posted) }).map(([fieldId, value]) => ({
    fieldId,
    value,
  }));

const isFileList = (value: unknown): value is FileAnswer[] =>
  Array.isArray(value) &&
  value.every((item) => typeof item === 'object' && item !== null && 'publicId' in item);

const storedAnswers = (draft: StoredSubmission): FormAnswer[] =>
  (draft.answers ?? []).map((answer) => ({ fieldId: answer.fieldId, value: answer.value ?? null }));

// A draft keeps any address given for a resume link until the answers
// themselves supply one, so privacy requests can still find it.
const mergedApplicant = (
  draft: StoredSubmission,
  steps: readonly FormStep[],
  answers: readonly FormAnswer[],
): ApplicantIdentity => ({ ...draft.applicant, ...applicantFromAnswers(steps, answers) });

/**
 * Everything an applicant does (plan §3.4, D7, D8, D9, D12): reading a
 * public form, starting and autosaving a draft, uploading files, submitting,
 * and asking for a link to finish later.
 *
 * Applicants have no account. A draft is reached only with its token, sent
 * in the `x-draft-token` header, and nothing internal is ever returned: no
 * submission ids, no reviews, nothing about who is notified.
 */
@injectable()
export class ApplicantService {
  // eslint-disable-next-line max-params
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.EmailProvider) private readonly email: EmailProvider,
    @inject(TOKENS.MediaProvider) private readonly media: MediaProvider,
    @inject(AuditService) private readonly audit: AuditService,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
  ) {}

  /** A published or closed form's public page. Drafts and archived forms are not found. */
  async publicForm(slug: string): Promise<PublicForm> {
    return toPublicForm(await this.visibleForm(slug), new Date());
  }

  /**
   * Any form, in any status, for a colleague holding a preview token (plan
   * D10). A bad or expired token is simply not found.
   */
  async previewForm(token: string | undefined): Promise<PublicForm> {
    const id = verifyPreviewToken(token, 'form', this.config);
    const form = id ? await FormModel.findById(id).lean<StoredForm>().exec() : null;
    if (!form) {
      throw new NotFoundError('Preview');
    }
    return toPublicForm(form, new Date());
  }

  /**
   * Begin: the in-progress record and the token that reaches it. Created even
   * when the form keeps no drafts, so uploads can be signed against it; the
   * answers are then only kept at submission.
   */
  async createDraft(slug: string, input: DraftCreateInput): Promise<DraftSession> {
    const now = new Date();
    const form = await this.visibleForm(slug);
    this.assertOpen(form, now);
    await this.assertUnderLimit(form);
    const keepsDrafts = form.settings?.allowDrafts ?? true;
    const answers = keepsDrafts ? knownAnswers(form.steps, input.answers ?? []) : [];
    this.assertDraftAnswers(form.steps, answers);
    const token = newDraftToken();
    const created = await FormSubmissionModel.create({
      formId: form._id,
      formVersion: form.version,
      status: 'draft',
      applicant: applicantFromAnswers(form.steps, answers),
      answers,
      tokenHashes: [hashDraftToken(token)],
      draftExpiresAt: draftExpiry(now),
    });
    return {
      token,
      draft: toApplicantDraft(created.toObject() as unknown as StoredSubmission, form.slug),
    };
  }

  async readDraft(slug: string, token: string | undefined): Promise<ApplicantDraft> {
    const form = await this.visibleForm(slug);
    return toApplicantDraft(await this.draftFor(form, token, new Date()), form.slug);
  }

  /**
   * Autosave: the full set of answers so far, replacing what was stored.
   * Checked in draft mode only, so half-typed work is never refused, and each
   * save gives the draft another thirty days.
   */
  async saveDraft(
    slug: string,
    token: string | undefined,
    input: DraftSaveInput,
  ): Promise<ApplicantDraft> {
    const now = new Date();
    const form = await this.visibleForm(slug);
    if (!(form.settings?.allowDrafts ?? true)) {
      throw new FormUnavailableError(
        'This form does not keep drafts. Your answers are sent when you submit.',
        'drafts-off',
      );
    }
    const draft = await this.draftFor(form, token, now);
    const answers = knownAnswers(form.steps, input.answers);
    this.assertDraftAnswers(form.steps, answers);
    const currentStepId = form.steps.some((step) => step.id === input.currentStepId)
      ? input.currentStepId
      : undefined;
    const saved = await FormSubmissionModel.findOneAndUpdate(
      { _id: draft._id, status: 'draft', draftExpiresAt: { $gt: now } },
      {
        $set: {
          answers,
          formVersion: form.version,
          applicant: mergedApplicant(draft, form.steps, answers),
          draftExpiresAt: draftExpiry(now),
          ...(currentStepId ? { currentStepId } : {}),
        },
        ...(currentStepId ? {} : { $unset: { currentStepId: 1 } }),
      },
      { returnDocument: 'after' },
    )
      .lean<StoredSubmission>()
      .exec();
    if (!saved) {
      throw draftNotFound();
    }
    return toApplicantDraft(saved, form.slug);
  }

  /**
   * Sign one upload into the draft's own folder (plan D7), after checking
   * the question takes files of this name and size.
   */
  async signUpload(
    slug: string,
    token: string | undefined,
    input: UploadSignInput,
  ): Promise<SignedApplicationUpload> {
    const now = new Date();
    const form = await this.visibleForm(slug);
    this.assertOpen(form, now);
    const draft = await this.draftFor(form, token, now);
    const field = allFields(form.steps).find((candidate) => candidate.id === input.fieldId);
    if (!field || field.type !== 'file') {
      throw new ValidationError('This question does not take files', [
        { path: 'fieldId', message: 'This question does not take files.' },
      ]);
    }
    const formats = acceptedFormatsFor(field);
    if (!isAcceptedFilename(field, input.filename)) {
      throw new ValidationError('This question does not accept that kind of file', [
        { path: 'filename', message: `Use one of these file types: ${formats.join(', ')}.` },
      ]);
    }
    const maxBytes = maxFileBytesFor(field);
    if (input.bytes > maxBytes) {
      throw new ValidationError('That file is too large', [
        {
          path: 'bytes',
          message: `Files for this question can be up to ${maxBytes / (1024 * 1024)} MB.`,
        },
      ]);
    }
    try {
      return this.media.createSignedApplicationUpload({
        formId: form._id.toString(),
        draftId: draft._id.toString(),
        fieldId: field.id,
        formats,
        maxBytes,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableError(
          'File uploads are not available at the moment. Please try again later.',
        );
      }
      throw error;
    }
  }

  /**
   * Submit. The saved answers, with any sent now laid over them, are checked
   * in full against the form as it is now, answers to hidden questions are
   * dropped, and every file is checked against the draft's folder and what
   * Cloudinary holds. The token stops working once this succeeds.
   */
  async submit(
    slug: string,
    token: string | undefined,
    input: DraftSubmitInput,
  ): Promise<SubmissionReceipt> {
    const now = new Date();
    const form = await this.visibleForm(slug);
    this.assertOpen(form, now);
    await this.assertUnderLimit(form);
    const draft = await this.draftFor(form, token, now);
    const answers = pruneHiddenAnswers(
      form.steps,
      mergeAnswers(storedAnswers(draft), input.answers ?? []),
    );
    const problems = validateAnswers(form.steps, answers, { mode: 'submit' });
    if (problems.length > 0) {
      throw answerProblemsError('Some answers need attention', problems);
    }
    const verified = await this.verifyFiles(form, draft, answers);
    const consentIds = new Set(
      allFields(form.steps)
        .filter((field) => field.type === 'consent')
        .map((field) => field.id),
    );
    const agreed = verified.some(
      (answer) => consentIds.has(answer.fieldId) && answer.value === true,
    );

    const submitted = await withUniqueReference((reference) =>
      FormSubmissionModel.findOneAndUpdate(
        { _id: draft._id, status: 'draft' },
        {
          $set: {
            reference,
            status: 'submitted',
            submittedAt: now,
            formVersion: form.version,
            answers: verified,
            applicant: applicantFromAnswers(form.steps, verified),
            statusHistory: [{ from: 'draft', to: 'submitted', at: now }],
            ...(agreed ? { consent: { version: CONSENT_VERSION, at: now } } : {}),
          },
          $unset: { tokenHashes: 1, draftExpiresAt: 1, currentStepId: 1 },
        },
        { returnDocument: 'after' },
      )
        .lean<StoredSubmission>()
        .exec(),
    );
    if (!submitted?.reference) {
      throw draftNotFound();
    }
    await this.audit.record({
      module: 'applications',
      entityType: 'application',
      entityId: submitted._id,
      action: 'submitted',
      summary: `Submitted ${submitted.reference} to "${form.title}"`,
    });
    await Promise.all([this.acknowledge(form, submitted), this.notifyStaff(form, submitted)]);
    const successMessage = form.settings?.successMessage;
    return {
      reference: submitted.reference,
      submittedAt: now.toISOString(),
      ...(successMessage ? { successMessage } : {}),
    };
  }

  /**
   * "Email me a link to finish later" (plan D8). Always accepted, whatever
   * happens, so the answer never says whether a token or a form exists. When
   * the token reaches a live draft, a fresh token is added beside it (the
   * open tab keeps working) and sent to the address given.
   */
  async requestResumeLink(
    slug: string,
    token: string | undefined,
    input: ResumeLinkInput,
  ): Promise<void> {
    const now = new Date();
    const form = await FormModel.findOne({ slug, status: 'published', archivedAt: null })
      .lean<StoredForm>()
      .exec();
    if (!form || !(form.settings?.allowDrafts ?? true) || !isDraftTokenShape(token)) {
      return;
    }
    const fresh = newDraftToken();
    const draft = await FormSubmissionModel.findOneAndUpdate(
      {
        formId: form._id,
        status: 'draft',
        tokenHashes: hashDraftToken(token),
        draftExpiresAt: { $gt: now },
      },
      {
        $push: { tokenHashes: { $each: [hashDraftToken(fresh)], $slice: -MAX_DRAFT_TOKENS } },
        $set: { 'applicant.email': input.email, draftExpiresAt: draftExpiry(now) },
      },
      { returnDocument: 'after' },
    )
      .lean<StoredSubmission>()
      .exec();
    if (!draft) {
      return;
    }
    await this.sendResumeLink(form, draft, input.email, fresh);
  }

  // ── Lookups and checks ────────────────────────────────────────────────

  /** A form with a public page: published or closed, and not archived. */
  private async visibleForm(slug: string): Promise<StoredForm> {
    const form = await FormModel.findOne({
      slug,
      status: { $in: ['published', 'closed'] },
      archivedAt: null,
    })
      .lean<StoredForm>()
      .exec();
    if (!form) {
      throw new NotFoundError('Form');
    }
    return form;
  }

  private assertOpen(form: StoredForm, now: Date): void {
    const window = publicWindow(form, now);
    if (window !== 'open') {
      throw new FormUnavailableError(CLOSED_MESSAGES[window], window);
    }
  }

  private async assertUnderLimit(form: StoredForm): Promise<void> {
    const limit = form.settings?.submissionLimit;
    if (!limit) {
      return;
    }
    const count = await FormSubmissionModel.countDocuments({
      formId: form._id,
      status: { $ne: 'draft' },
    }).exec();
    if (count >= limit) {
      throw new FormUnavailableError(
        'This form has received all the applications it can take.',
        'limit-reached',
      );
    }
  }

  private async draftFor(
    form: StoredForm,
    token: string | undefined,
    now: Date,
  ): Promise<StoredSubmission> {
    if (!isDraftTokenShape(token)) {
      throw draftNotFound();
    }
    const draft = await FormSubmissionModel.findOne({
      formId: form._id,
      status: 'draft',
      tokenHashes: hashDraftToken(token),
      draftExpiresAt: { $gt: now },
    })
      .lean<StoredSubmission>()
      .exec();
    if (!draft) {
      throw draftNotFound();
    }
    return draft;
  }

  private assertDraftAnswers(steps: readonly FormStep[], answers: readonly FormAnswer[]): void {
    const problems = validateAnswers(steps, answers, { mode: 'draft' });
    if (problems.length > 0) {
      throw answerProblemsError('Some answers could not be saved', problems);
    }
  }

  // ── Files ─────────────────────────────────────────────────────────────

  /**
   * Check every file answer, and return the answers with each file's stored
   * size and type in place of what the browser said.
   */
  private async verifyFiles(
    form: StoredForm,
    draft: StoredSubmission,
    answers: readonly FormAnswer[],
  ): Promise<FormAnswer[]> {
    const fields = new Map(allFields(form.steps).map((field) => [field.id, field]));
    const stepOf = new Map(
      form.steps.flatMap((step) => step.fields.map((field) => [field.id, step.id] as const)),
    );
    const scope: DraftFileScope = {
      rootFolder: this.config.cloudinary.folder,
      cloudName: this.config.cloudinary.cloudName ?? null,
      formId: form._id.toString(),
      draftId: draft._id.toString(),
    };
    const problems: AnswerProblem[] = [];
    const checked = await Promise.all(
      answers.map(async (answer) => {
        const field = fields.get(answer.fieldId);
        if (field?.type !== 'file' || !isFileList(answer.value)) {
          return answer;
        }
        const results = await Promise.all(
          answer.value.map((file) => this.checkFile(field, file, scope)),
        );
        const problem = results.find((result) => result.problem)?.problem;
        if (problem) {
          problems.push({
            fieldId: field.id,
            stepId: stepOf.get(field.id) ?? '',
            message: problem,
          });
        }
        return { fieldId: answer.fieldId, value: results.map((result) => result.file) };
      }),
    );
    if (problems.length > 0) {
      throw answerProblemsError('Some files need to be uploaded again', problems);
    }
    return checked;
  }

  private async checkFile(
    field: FormField,
    file: FileAnswer,
    scope: DraftFileScope,
  ): Promise<{ file: FileAnswer; problem: string | null }> {
    const location = fileLocationProblem(file, scope);
    if (location) {
      return { file, problem: location };
    }
    let facts: AssetFacts | null;
    try {
      facts = await this.media.inspectAsset({
        publicId: file.publicId,
        ...(file.resourceType ? { resourceType: file.resourceType } : {}),
        type: 'authenticated',
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return { file, problem: `Upload "${file.name}" again.` };
      }
      throw error;
    }
    if (!facts) {
      return { file, problem: null };
    }
    const problem = storedFileProblem(field, file, facts);
    return problem ? { file, problem } : { file: withStoredFacts(file, facts), problem: null };
  }

  // ── Email (plan D12): best-effort, never failing the submission ──────

  private async acknowledge(form: StoredForm, submission: StoredSubmission): Promise<void> {
    const to = submission.applicant?.email;
    if (!form.settings?.acknowledgeApplicant || !to || !submission.reference) {
      return;
    }
    const success = form.settings.successMessage;
    const bodyHtml = [
      `<p>Thank you for your application to <strong>${escapeHtml(form.title)}</strong>. It has reached us safely.</p>`,
      `<p>Your reference is <strong>${escapeHtml(submission.reference)}</strong>. Please quote it if you write to us about your application.</p>`,
      success ? textToEmailHtml(success) : '',
    ].join('');
    try {
      await this.email.send({
        to,
        subject: `We have received your application (${submission.reference})`,
        html: emailLayout({ heading: 'Application received', bodyHtml }),
      });
    } catch (err) {
      this.logger.error(
        { err, module: 'forms', entityId: submission._id.toString() },
        'Failed to send an application acknowledgement',
      );
    }
  }

  /**
   * Tell the team. Names the form, the reference and the applicant, and
   * links to the dashboard; the answers stay out of inboxes.
   */
  private async notifyStaff(form: StoredForm, submission: StoredSubmission): Promise<void> {
    const configured = form.settings?.notifyEmails ?? [];
    const recipients = configured.length > 0 ? configured : [this.config.email.notifyTo];
    const reference = submission.reference ?? '';
    const link = `${this.config.adminUrl.replace(/\/+$/, '')}/applications/${submission._id.toString()}`;
    const bodyHtml = [
      `<p>A new application has arrived through <strong>${escapeHtml(form.title)}</strong>.</p>`,
      `<p>Reference: <strong>${escapeHtml(reference)}</strong><br>Applicant: ${escapeHtml(submission.applicant?.name ?? 'Not given')}</p>`,
      '<p>The answers are in the dashboard, not in this email, so applicants’ details stay out of inboxes.</p>',
    ].join('');
    for (const to of recipients.filter(Boolean)) {
      try {
        await this.email.send({
          to,
          subject: `New application: ${form.title} (${reference})`,
          html: emailLayout({
            heading: 'New application',
            bodyHtml,
            action: { label: 'Open the application', url: link },
          }),
        });
      } catch (err) {
        this.logger.error(
          { err, module: 'forms', entityId: submission._id.toString() },
          'Failed to send a new-application notification',
        );
      }
    }
  }

  private async sendResumeLink(
    form: StoredForm,
    draft: StoredSubmission,
    to: string,
    token: string,
  ): Promise<void> {
    const link = `${this.config.siteUrl.replace(/\/+$/, '')}/apply/${form.slug}#resume=${token}`;
    const bodyHtml = [
      `<p>You asked for a link to finish your application to <strong>${escapeHtml(form.title)}</strong>.</p>`,
      `<p>The link keeps working for ${DRAFT_RETENTION_DAYS} days after you last save. Anyone with it can see and change your answers, so please do not forward this email.</p>`,
    ].join('');
    try {
      await this.email.send({
        to,
        subject: `Finish your application: ${form.title}`,
        html: emailLayout({
          heading: 'Continue your application',
          bodyHtml,
          action: { label: 'Continue your application', url: link },
        }),
      });
    } catch (err) {
      this.logger.error(
        { err, module: 'forms', entityId: draft._id.toString() },
        'Failed to send a resume link',
      );
    }
  }
}
