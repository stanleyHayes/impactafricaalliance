# Admin Platform Expansion — Implementation Plan

Projects · Tasks · Applications (form builder) · Impact Stories

- **Spec:** `docs/Impact_Africa_Alliance_AI_Implementation_Specification.docx` (the "AI Implementation
  Specification"). Section numbers below (§n) refer to it.
- **Discovery:** [`docs/IAA_EXPANSION_DISCOVERY.md`](IAA_EXPANSION_DISCOVERY.md) is the map of what
  exists. This document is the set of decisions and the build order. Where the spec's illustrative
  names differ from what is written here, this document wins, because it has been adapted to the
  repository (spec §0).
- **Branch:** `feat/admin-platform-expansion`.
- **Status:** see [§12 Progress log](#12-progress-log). Keep it updated as phases land.

---

## 1. Decisions

Each decision records what the spec asked for, what the repository already has, and what we do.

### D1. Names, keys and routes

The spec's `stories`, `submissions` and `reviews` are already taken by other features (testimonials,
the contact/partner/volunteer/job inbox, and event ratings). New modules take distinct keys so no
existing permission, route, collection or marketing contract changes meaning.

| Module | `AdminResource` key | Mongoose model / collection | Admin API | Public API | Admin UI routes |
| --- | --- | --- | --- | --- | --- |
| Projects | `projects` | `Project` / `projects` | `/api/admin/projects` | — | `/projects`, `/projects/new`, `/projects/:projectId/*`, `/projects/:projectId/edit` |
| Tasks | `tasks` | `Task` / `tasks`, `TaskComment` / `taskcomments` | `/api/admin/tasks` | — | `/tasks`, `/tasks/board`, `/tasks/all`, `/tasks/new`, `/tasks/:taskKey`, `/tasks/:taskKey/edit` |
| Forms | `forms` | `Form` / `forms`, `FormVersion` / `formversions` | `/api/admin/forms` | `/api/forms/...` | `/forms`, `/forms/new`, `/forms/:formId`, `/forms/:formId/edit` |
| Applications (form submissions) | `applications` | `FormSubmission` / `formsubmissions` | `/api/admin/applications` | (under `/api/forms/:slug/...`) | `/applications`, `/applications/review`, `/applications/:applicationId` |
| Impact Stories | `impact-stories` | `ImpactStory` / `impactstories` | `/api/admin/impact-stories` | `/api/impact-stories` | `/impact-stories`, `/impact-stories/published`, `/impact-stories/new`, `/impact-stories/from-project/:projectId`, `/impact-stories/:storyId/edit` |

- There is no `/api/public/` prefix in this codebase: public routers mount at `/api/<x>`, admin
  routers at `/api/admin/<x>` (`apps/api/src/app.ts`).
- The first admin URL segment equals the `AdminResource` key, because `mayRead` in
  `apps/admin/src/components/layout/nav-config.tsx` derives the nav permission from it.
- The existing CMS resource `stories` (testimonials) keeps its key, API and marketing Home grid. Only
  its **admin label** changes from "Impact Stories" to **"Testimonials"**, so the sidebar never shows
  two "Impact Stories".
- Marketing routes: `/impact/stories`, `/impact/stories/:slug`, `/impact/stories/preview`,
  `/apply/:slug`, `/apply/preview`.
- Enum values are lowercase kebab-case to match every existing const (`in-review`, not `IN_REVIEW`;
  `speaker-application`, not `SPEAKER_APPLICATION`).

### D2. Permissions

Only `read | create | update | delete` exist, and the permission matrix iterates every resource ×
every action, so adding a `publish` action would add a meaningless column to 30 rows. We map the
spec's verbs onto the existing four and keep one privileged step behind the Admin role, following the
social-publishing approval precedent (`requireRole(UserRole.Admin)` in `social.routes.ts`).

| Spec permission | Implemented as |
| --- | --- |
| `projects:read/create/update` | `projects:read/create/update` |
| `projects:archive` | `projects:update` (archive is a status). Hard delete: `projects:delete`, refused while tasks or stories are linked |
| `tasks:read/create/update` | same |
| `tasks:assign` | `tasks:update` |
| `forms:read/create/update` | same |
| `forms:publish` | `forms:update` **and** the Admin role (publishing a form opens a public page that collects personal data) |
| `submissions:read` | `applications:read` |
| `submissions:review` | `applications:update` (reviews, notes, status changes) |
| `stories:read/create/update` | `impact-stories:read/create/update` |
| `stories:publish` | `impact-stories:update` **and** the Admin role (publishing, unpublishing, archiving) |

Role templates (`packages/shared/src/enums.ts`):

- **Admins** get everything automatically.
- **Editors** get `create`/`update` on `projects`, `tasks`, `forms` and `impact-stories` (added to
  `writeResources`) and never `delete` (existing rule).
- **Editors do not get `applications:read` by default.** Today the editor template grants `read` on
  every resource automatically; we add an explicit exclusion list so applicant personal data is not
  exposed to every editor (spec §13 Privacy). An administrator grants it per person in the matrix.
- "My tasks" and "My projects" are filters, not permissions: anyone with `tasks:read` sees all tasks,
  anyone with `projects:read` sees all projects. IAA is a small team; record-level visibility is a
  non-goal for V1 and is noted in §11.
- Routers with action endpoints (`POST /:id/comments`, `POST /:id/reviews`…) guard **each route
  explicitly** with `requirePermission('<key>:<action>')` instead of the method-derived
  `requirePermissionFor`, because a POST would otherwise demand `create`. Never define PUT routes
  (`requirePermissionFor` does not check PUT).
- Rollout: after deploy, run `node tools/sync-user-permissions.mjs --env <file>` (dry run) then
  `--confirm` in each environment, and ask staff to sign out and in (15-minute JWT lag). This is the
  known "new tab renders empty" trap.

### D3. People directory

`GET /api/admin/users` is Admin-only and returns full records, so editors cannot pick assignees. New
endpoint **`GET /api/admin/people`** (`apps/api/src/modules/people/`):

- Guards: `requireAuth`, `requireRole(Admin, Editor)`, `requireAnyPermission` of any of
  `projects:read`, `tasks:read`, `forms:read`, `applications:read`, `impact-stories:read`.
- Query: `q` (regex-escaped, name or email), `ids` (comma list, max 50), `page`, `pageSize`.
- Returns `Paginated<PersonSummary>` with `{ id, name, email, role }` of **active** users only.
- `PeopleService.summaries(ids)` is the batch lookup every module uses to turn stored user ids into
  `PersonSummary` objects in responses. User references are stored as `ObjectId` with `ref: 'User'`.

### D4. Audit trail

There is no audit mechanism. Add a small additive collection (spec §13 Auditability):

- `AuditEvent` (`auditevents`): `{ module, entityType, entityId, action, actorId, actorEmail, summary,
  changes?: [{ field, from?, to? }], at }`. Indexes `{ entityType, entityId, at: -1 }` and
  `{ module, at: -1 }`.
- `AuditService.record(event)` is best-effort: it logs and swallows its own failure, so an audit
  write never fails the business write. The actor is always passed in from the route
  (`req.user.sub`, `req.user.email`); never from the body.
- Read through each module's own endpoint (`GET /api/admin/projects/:id/activity`, `.../tasks/:id/activity`,
  applications include `statusHistory`), so audit visibility follows the module's permission.
- Recorded actions: created, updated (with changed field names), status-changed, assigned/unassigned,
  archived/restored, deleted, published/unpublished, commented, reviewed, submitted.

### D5. Soft delete and archive

Nothing soft-deletes today. New modules add `archivedAt` and never cascade-delete:

- Projects: status `archived` + `archivedAt`. Lists exclude archived unless `includeArchived=true`.
  Hard delete only with `projects:delete` and only when no tasks and no impact stories reference it
  (409 with "Archive it instead").
- Tasks: `archivedAt` (hidden from lists and the board). Hard delete with `tasks:delete` removes the
  task and its comments (tasks are internal working records, not public or applicant data).
- Forms: `archivedAt`; `DELETE` refused (409) once any submission exists — close it instead.
- Applications: never deleted from the admin UI; only privacy erasure removes them.
- Impact stories: status `archived`; `DELETE` only for never-published drafts.

### D6. Dates

- **Calendar dates** (task start/due, project start/end, milestone due) are stored as ISO datetimes
  at **12:00 UTC** of the chosen day (`toCalendarDateIso('2026-10-05')` →
  `'2026-10-05T12:00:00.000Z'`), and read back with `calendarDateKey(iso)` → `'2026-10-05'`. Noon UTC
  keeps the same calendar day for every staff time zone between UTC−11 and UTC+11. They still pass
  `clearableDate` (full ISO), so `null` clears on PATCH.
- **Due buckets** (`overdue | today | upcoming | none`) compare calendar-date keys with the caller's
  local date, sent as `today=YYYY-MM-DD` (defaults to the server's UTC date).
- **Instants** (form `opensAt`/`closesAt`, `publishedAt`, timestamps) use the existing
  `IsoDateTimeField` (MUI X DateTimePicker, 12-hour, local display / UTC storage).
- The admin gets a themed MUI X **`DateField`** for calendar dates. An invalid date never clears a
  value; clearing sends `null`.

### D7. Uploads

- **Staff uploads** (task attachments, project media and documents, story images) reuse the signed
  direct-to-Cloudinary flow. New admin signing profile `POST /api/admin/media/sign-document`
  (`media:create`) allows `jpg, jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, csv, ppt, pptx, txt`
  up to 10 MB. `uploadToCloudinary` gains options `{ register?: boolean; profile?: 'image' | 'document' }`;
  attachments and documents pass `register: false` so they do not flood the media library.
- **Applicant uploads** get a new public signer bound to a draft:
  `POST /api/forms/:slug/draft/uploads/sign` requires a valid draft token, a published form inside its
  window, and a dedicated rate limit. It signs `folder = <root>/applications/<formId>/<draftId>`, a
  server-generated `public_id`, the field's allowed formats, and **`type: 'authenticated'`**, so
  applicant files are not public URLs. On submit the server checks every file answer's `publicId`
  starts with that folder, and (when Cloudinary is configured) confirms size and format through the
  Admin API. Admins view files through **signed delivery URLs** generated when an application is
  read.
- `MediaProvider` gains: `createSignedDocumentUpload()`, `createSignedApplicationUpload(opts)`,
  `signedDeliveryUrl(asset)`, `inspectAsset(asset)` and `destroyAsset(asset)` (the last three are
  no-ops returning `null` when Cloudinary is not configured, so tests and local dev work).
- Embedded `MediaAsset` snapshots stay the convention (no `coverMediaId`). Documents and attachments use
  `fileAssetSchema` = `mediaAssetSchema` + `{ format?, bytes?, resourceType?, originalFilename? }`.

### D8. Public applicant sessions (drafts and resume)

- A draft is a `FormSubmission` with `status: 'draft'`. Creating one returns an opaque **draft token**
  (32 random bytes, base64url). Only its SHA-256 hash is stored (`tokenHashes`, max 5 active) with
  `draftExpiresAt` (30 days, refreshed on save). A TTL index with a `partialFilterExpression` on
  `status: 'draft'` deletes expired drafts. This follows the password-reset precedent, not the
  stateless review HMAC (which cannot expire or be revoked).
- The token travels in the **`x-draft-token` header** (CORS credentials are off, and query strings reach
  analytics). The browser keeps it in `localStorage` under `iaa:marketing:apply:<slug>` (try/catch).
- "Email me a link to finish later": `POST /api/forms/:slug/draft/resume-link { email }` always answers
  202. When a draft exists for that token, the server rotates in a fresh token and emails
  `<PUBLIC_SITE_URL>/apply/<slug>#resume=<token>` (a fragment, so it never reaches servers or
  analytics). The page moves the token into storage and strips the fragment.
- Submission ids are never authorisation. A submitted draft stops accepting the token.
- `settings.allowDrafts = false` means no autosave and no resume link; the in-progress record is still
  created on Begin so uploads can be signed, but answers are only sent at submit.

### D9. Rate limits

`sensitiveRateLimit` is one shared 20/15 min bucket that also covers `/auth/refresh`; exhausting it
logs staff out. New endpoints never use it. New limiters in `apps/api/src/middleware/rate-limit.ts`:

| Limiter | Window / max | Used by |
| --- | --- | --- |
| `formDraftRateLimit` | 15 min / 300 | create draft, autosave, read draft |
| `formSubmitRateLimit` | 15 min / 10 | final submit |
| `formUploadRateLimit` | 15 min / 40 | applicant upload signing |
| `resumeLinkRateLimit` | 15 min / 5 | resume-link email |

All return the existing `{ error: { code: 'RATE_LIMITED', message } }` body.

### D10. Previews

The admin and marketing share no UI code, so "preview the exact public representation" (spec §9.3)
uses the real marketing renderer:

- `POST /api/admin/impact-stories/:id/preview` and `POST /api/admin/forms/:id/preview` return
  `{ url, expiresAt }`. The token is a JWT (`jsonwebtoken`, access secret, audience `iaa-preview`,
  subject `impact-story:<id>` / `form:<id>`, 2 hours) from `apps/api/src/common/preview-token.ts`.
- The URL is `<PUBLIC_SITE_URL>/impact/stories/preview#<token>` or `/apply/preview#<token>`. The
  marketing page reads the fragment and calls `GET /api/impact-stories/preview` or
  `GET /api/forms/preview` with header `x-preview-token`. Preview pages are `noindex`, show a
  "Preview" ribbon, and a form preview never creates drafts or submissions.

### D11. Indexes in production

`autoIndex` is off in production and nothing builds indexes. Add
`apps/api/src/sync-indexes.ts` with `npm run indexes:sync -w @iaa/api` (dry run lists what would be
created; `--confirm` calls `createIndexes()` on the expansion models, which never drops an index).
Run it once per environment after deploy, before the permission backfill. Integration tests
`await Model.init()` before asserting duplicate-key 409s.

### D12. Notifications

There is no notification system (the bell is submissions-only). Following spec §5.4 we keep a boundary
and do not couple task writes to email:

- `TaskEventPublisher` interface (`TOKENS.TaskEvents`) with events `task.assigned`, `task.unassigned`,
  `task.commented`, `task.mentioned`, `task.due-changed`, `task.status-changed`. The V1 implementation
  records nothing beyond the audit trail and a debug log.
- Pull-based signals ship now: the "My tasks" nav badge (overdue + due today) and a dashboard "Your
  work" panel.
- Applications: acknowledgement email to the applicant (if the form enables it) and a notification
  to `settings.notifyEmails` (falling back to `EMAIL_NOTIFY_TO`) are sent through the existing
  `EmailProvider`, best-effort, never failing the submission.
- Email/in-app task notifications and due-date reminders (through `/api/automations/run`) are a later
  phase (§11).

### D13. Drag and drop

Add `@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` to `@iaa/admin` (keyboard and touch
accessible). Every drag has a button alternative (existing a11y pattern: move up / move down). Board
moves send an absolute, idempotent `PATCH /api/admin/tasks/:id/move { status, boardOrder }`, safe for
the API client's automatic PATCH retry. `boardOrder` is a float; `boardOrderBetween(before, after)` picks
the midpoint. The server stays authoritative: the client applies the move optimistically and rolls
back on error.

### D14. Versioning of form definitions

- Every form has an integer `version`. Publishing snapshots `{ title, intro, steps }` into
  `FormVersion (formId, version)`. While a form is published, any save that changes `intro` or `steps`
  creates the next snapshot immediately, so applicants always get a consistent definition.
- A submission records `formVersion`: the version it was validated against at submit. The admin
  renders answers in that snapshot's step order, with labels from the snapshot (spec §6.3, §8).
- Answers are `[{ fieldId, value }]` keyed by stable ids (never labels, and never object keys, because
  `sanitizeBody` drops keys containing `.`). Field and option ids match `^[a-z0-9][a-z0-9_-]{0,39}$`.

### D15. Validation

Every rule lives once in `@iaa/shared` and runs on both sides:

- Form answers: `validateAnswers(definition, answers, { mode: 'draft' | 'submit' })` in
  `packages/shared/src/schemas/form.ts`. Draft mode checks types and lengths only; submit mode adds
  required and visibility-aware checks. The server always re-validates against the stored version and
  drops answers to hidden fields (the existing event-registration code does not — do not copy it).
- Status transitions: `canTransitionProject`, `canTransitionTask` (free movement, see below),
  `canChangeApplicationStatus`, `canTransitionImpactStory`, `formPublishProblems`,
  `storyPublishProblems`.
- Routes always use `parseWith(schema, input)` (a raw `.parse()` turns into a 500).

### D16. Rich content and security

- Rich text is Markdown, rendered with `react-markdown` and no `rehype-raw` in both apps (no HTML is
  ever executed; no sanitiser is needed on the API). Story blocks are structured JSON, never HTML.
- Video blocks accept YouTube and Vimeo URLs only, turned into `youtube-nocookie.com` / `player.vimeo.com`
  embed URLs by `videoEmbedUrl()`.
- CTA and partner URLs must be `https:` or a site-relative path starting with `/`.
- Public story responses omit `projectId`, `createdBy`, `updatedBy`; applicant data never appears in
  any public response; internal reviews are never exposed.
- Never trust client ids: actor ids come from `req.user`; referenced ids (projects, users, milestones,
  parent tasks) are checked to exist (and users to be active) in the service.

---

## 2. Shared contracts (`packages/shared/src`)

All new files use `.js` import suffixes and the per-schema `as const` tuple style. Update schemas are
built with `partialForUpdate`, never carry `.default().optional()`, and nested objects inside them have
no defaults (they are replaced whole on PATCH). Every new name is unique in the flat barrel.

| File | Contents |
| --- | --- |
| `enums.ts` | `AdminResource.Projects/Tasks/Forms/Applications/ImpactStories`; editor `writeResources` += projects, tasks, forms, impact-stories; `EDITOR_READ_EXCLUDED = [applications]` |
| `schemas/work.ts` | `WORK_PRIORITIES` (`low, medium, high, urgent`), `stableIdSchema`, `PersonSummary`, `peopleQuerySchema`, `fileAssetSchema`/`FileAsset`, `FileAttachment` DTO, `AuditEvent` DTO, `PreviewLink`, `toCalendarDateIso`, `calendarDateKey`, `dueBucket`, `boardOrderBetween`, `newStableId` |
| `schemas/project.ts` | statuses + transitions, milestone/metric/risk/partner schemas, `projectInputSchema`, `projectUpdateSchema`, `projectMediaInputSchema`, `projectDocumentInputSchema`, `projectListQuerySchema`, DTOs `Project`, `ProjectListItem`, `ProjectProgress`, helpers `computeProjectProgress`, `canTransitionProject`, `projectDateProblem` |
| `schemas/task.ts` | statuses, board columns, due filters, `checklistItemSchema`, `taskInputSchema`, `taskUpdateSchema`, `taskMoveSchema`, checklist/comment/attachment inputs, `taskListQuerySchema`, `taskBoardQuerySchema`, DTOs `Task`, `TaskListItem`, `TaskRef`, `TaskComment`, `TaskBoard`, `TaskSummary`, helpers `isTaskOpen`, `canTransitionTask` |
| `schemas/form.ts` | types, statuses, field types, file kinds → formats, visibility rules, field/step/settings/intro schemas, `formInputSchema`, `formUpdateSchema`, `formStatusChangeSchema`, `formListQuerySchema`, answer schemas, DTOs `FormDefinition`, `FormListItem`, `PublicForm`, `FormVersionSnapshot`, helpers `isFieldVisible`, `isStepVisible`, `visibleSteps`, `validateAnswer`, `validateAnswers`, `pruneHiddenAnswers`, `formWindowState`, `formPublishProblems`, `applicantFromAnswers`, `FORM_TEMPLATES` (speaker application) |
| `schemas/application.ts` | statuses, recommendations, public inputs (draft create/save, submit, resume link, upload sign), admin inputs (status change, review), `applicationListQuerySchema`, DTOs `ApplicantDraft`, `SubmissionReceipt`, `ApplicationListItem`, `AdminApplication`, `ApplicationReview`, `ApplicationStatusChange`, `SignedApplicationUpload`, helpers `canChangeApplicationStatus` |
| `schemas/impact-story.ts` | statuses + transitions, block types and per-type data schemas, `storyBlockSchema` (discriminated union), `impactStoryInputSchema`, `impactStoryUpdateSchema`, `impactStoryStatusChangeSchema`, `impactStoryListQuerySchema`, `publicImpactStoryQuerySchema`, DTOs `ImpactStory`, `ImpactStoryListItem`, `PublicImpactStory`, `PublicImpactStoryListItem`, helpers `storyPublishProblems`, `canTransitionImpactStory`, `videoEmbedUrl`, `storyFromProject` |
| `schemas/media-item.ts` | `MEDIA_FOLDERS` += `projects`, `stories` |

Detailed field lists are in the schema files; their JSDoc is the reference. Key shapes:

- **Project:** title, slug, code?, summary, description (Markdown), status
  (`draft, planned, active, on-hold, completed, archived`), priority, leadId?, memberIds[],
  programme? (a `PILLARS` key), startDate?, endDate?, country?, region?, locationText?, objectives[],
  partners[{name, role?, url?}], tags[], sdgs[1–17], cover?, milestones[{id, kind: milestone|activity,
  title, description?, dueDate?, status: planned|in-progress|done, completedAt?}], metrics[{id, label,
  value, target?, suffix?}], risks[{id, title, level, mitigation?, status}], progressOverride?{value,
  reason}. Managed through sub-endpoints: media[{id, image, caption?, takenOn?, shareable, addedBy,
  addedAt}], documents[{id, name, file: FileAsset, addedBy, addedAt}]. Server-computed: progress,
  taskCounts, storyCount, lead/members as `PersonSummary`.
- **Progress** (`computeProjectProgress`): `(done tasks + done milestones) / (non-archived tasks +
  milestones)`, rounded; `source: 'manual'` when a `progressOverride` is set (shown as "Set by hand:
  <reason>"); `value: null, source: 'none'` when there is nothing to count.
- **Task:** key (`IAA-<n>` from an atomic counter), title, description (Markdown), status
  (`backlog, todo, in-progress, review, done, blocked`), priority, assigneeIds[≤10], projectId?,
  milestoneId?, startDate?, dueDate?, estimateHours?, labels[], checklist[{id, text, done, doneAt?,
  doneBy?}], attachments[FileAttachment], parentTaskId?, dependencyIds[], boardOrder, commentCount,
  completedAt (set when entering `done`, cleared when leaving), archivedAt. Any status may move to any
  other (a board, not a gated workflow); `blocked` requires nothing. Subtasks are tasks with
  `parentTaskId`.
- **Form:** title, slug, type (`speaker-application, volunteer, mentor, partnership, event, survey,
  general`), description (internal), status (`draft, published, closed`), intro{heading, description?,
  image?}, settings{opensAt?, closesAt?, allowDrafts, successMessage?, submissionLimit?,
  notifyEmails[], acknowledgeApplicant}, steps[{id, title, description?, image?, visibility?,
  fields[{id, type, label, helpText?, placeholder?, required, options[{value, label}],
  validation?{minLength?, maxLength?, min?, max?, maxFiles?, fileKinds?, maxSizeMB?}, visibility?{match:
  all|any, rules[{fieldId, operator, value?}]}, consentText?, mapsTo?: applicant-name|applicant-email|
  applicant-phone}]}], version, publishedAt?, closedAt?, archivedAt?. Field types: `short-text,
  long-text, email, phone, number, date, select, multi-select, radio, checkbox, url, file, consent`.
  Visibility operators: `equals, not-equals, includes, not-includes, is-empty, is-not-empty`; a rule
  may only reference a field that comes earlier in the form.
- **FormSubmission:** reference (`APP-XXXXXX`), formId, formVersion, status (`draft, submitted,
  under-review, shortlisted, accepted, rejected`), applicant{name?, email?, phone?} (derived from
  `mapsTo` fields, else the first email field), answers[{fieldId, value}], currentStepId?,
  tokenHashes[], draftExpiresAt?, consent{version, at}?, submittedAt?, reviews[{id, reviewerId, notes,
  recommendation?: strong-yes|yes|maybe|no, score?: 1–5, createdAt}], statusHistory[{from, to, note?,
  byId?, at}]. Answer values: string, string[], boolean, number, file answers[{publicId, url, name,
  format?, bytes?, resourceType?}], or null.
- **ImpactStory:** projectId?, title, slug, excerpt, cover?, status (`draft, in-review, published,
  archived`), blocks[{id, type, data}] with types `hero, rich-text, image, gallery, video, quote, metrics,
  timeline, partners, cta`, tags[], country?, programme?, seo{title?, description?, image?}?,
  publishedAt?, schemaVersion (1), createdBy, updatedBy. Array order is block order.

---

## 3. API (`apps/api/src`)

Hand-written modules (the generic CRUD engine has no actor attribution, filters, sub-resources or soft
delete). Layout per module: `<x>.model.ts`, `<x>.service.ts` (`@injectable`, explicit `@inject`),
`<x>.routes.ts` (`create<X>Routers(container)`), `<x>.service.test.ts`, plus
`test/integration/<x>.test.ts`. Admin router preamble:
`requireAuth(tokens), requireRole(Admin, Editor)` then **per-route** `requirePermission(...)`.

### 3.1 Foundation (shared by all modules)

| Piece | Path |
| --- | --- |
| Audit model + service | `modules/audit/audit.model.ts`, `modules/audit/audit.service.ts` |
| People directory | `modules/people/people.routes.ts`, `people.service.ts` (+ `UserRepository.findDirectory`, `findSummaries`) mounted at `/api/admin/people` |
| Atomic counters | `common/counter.model.ts` (`nextSequence(name)`) |
| Preview tokens | `common/preview-token.ts` (`signPreviewToken`, `verifyPreviewToken`) |
| Regex escape | `common/regex.ts` (`escapeRegex`) |
| HTML email helpers | `common/email-html.ts` (`escapeHtml`, `emailLayout`) — new code uses this instead of copying `escapeHtml` again |
| Rate limiters | `middleware/rate-limit.ts` (D9) |
| Media profiles | `providers/media.provider.ts` (D7), `modules/media/media.routes.ts` (`/sign-document`) |
| Task events boundary | `tokens.ts` `TaskEvents`, `modules/tasks/task-events.ts` (interface + logging implementation), registered in `container.ts` |
| Index sync | `sync-indexes.ts`, npm script `indexes:sync` |
| Models (data contract) | `modules/projects/project.model.ts`, `modules/tasks/task.model.ts`, `modules/tasks/task-comment.model.ts`, `modules/forms/form.model.ts`, `modules/forms/form-version.model.ts`, `modules/forms/form-submission.model.ts`, `modules/impact-stories/impact-story.model.ts` |
| Router mounts | `app.ts` mounts every new router (public before admin, all before `notFoundHandler`) |

### 3.2 Projects — `/api/admin/projects`

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /` | `projects:read` | `projectListQuerySchema`: `q`, `status`, `priority`, `programme`, `mine`, `includeArchived`, `sort` (`updated, start, end, title`), `page`, `pageSize` → `Paginated<ProjectListItem>` |
| `POST /` | `projects:create` | validates lead/members exist and are active; audit `created` |
| `GET /:id` | `projects:read` | `Project` with progress, taskCounts, storyCount, people |
| `PATCH /:id` | `projects:update` | `projectUpdateSchema`; status via `canTransitionProject`; `archived` sets `archivedAt`; audit with changed fields |
| `DELETE /:id` | `projects:delete` | 409 when tasks or stories reference it |
| `POST /:id/media` | `projects:update` | `projectMediaInputSchema`, max 200 items |
| `PATCH /:id/media/:itemId` | `projects:update` | caption, takenOn, shareable |
| `DELETE /:id/media/:itemId` | `projects:update` | |
| `POST /:id/documents` | `projects:update` | `projectDocumentInputSchema`, max 100 |
| `DELETE /:id/documents/:documentId` | `projects:update` | |
| `GET /:id/activity` | `projects:read` | `Paginated<AuditEvent>` |

Array items are added/removed with atomic `$push`/`$pull` so two people adding evidence at once do not
overwrite each other.

### 3.3 Tasks — `/api/admin/tasks`

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /` | `tasks:read` | `taskListQuerySchema`: `q` (title/key), `status` (comma list), `priority`, `assigneeId` (id, `me`, `none`), `projectId` (id or `none`), `due` (`overdue, today, upcoming, none`), `today`, `label`, `includeArchived`, `includeDone`, `sort` (`due, updated, priority, created, key`), `order`, paging |
| `GET /board` | `tasks:read` | same filters; `TaskBoard` with each column's first 100 by `boardOrder` and its total |
| `GET /summary` | `tasks:read` | `TaskSummary` for the caller (`overdue, dueToday, upcoming, open`) |
| `POST /` | `tasks:create` | key from `nextSequence('task')`; validates project/milestone/assignees/parent/dependencies; emits `task.assigned` |
| `GET /:idOrKey` | `tasks:read` | `Task` with people, project, parent, dependencies, subtasks |
| `PATCH /:id` | `tasks:update` | status changes maintain `completedAt`; assignment changes audited and emitted |
| `PATCH /:id/move` | `tasks:update` | `taskMoveSchema { status, boardOrder }` (idempotent) |
| `POST /:id/checklist` · `PATCH /:id/checklist/:itemId` · `DELETE /:id/checklist/:itemId` | `tasks:update` | atomic positional updates |
| `POST /:id/attachments` · `DELETE /:id/attachments/:attachmentId` | `tasks:update` | max 20 |
| `GET /:id/comments` | `tasks:read` | paginated, oldest first |
| `POST /:id/comments` | `tasks:update` | `@name` mentions resolved to user ids; increments `commentCount` |
| `PATCH /:id/comments/:commentId` · `DELETE /:id/comments/:commentId` | `tasks:update` | author only (delete: author or Admin) |
| `GET /:id/activity` | `tasks:read` | |
| `DELETE /:id` | `tasks:delete` | removes comments too |

### 3.4 Forms and applications

Admin `/api/admin/forms`:

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /` | `forms:read` | `formListQuerySchema` (`q`, `status`, `type`, `includeArchived`, paging); list items carry submission counts |
| `POST /` | `forms:create` | optional `template: 'speaker-application'` seeds steps from `FORM_TEMPLATES` |
| `GET /:id` | `forms:read` | |
| `PATCH /:id` | `forms:update` | re-snapshots when published and `intro`/`steps` changed (D14); ids must stay unique |
| `PATCH /:id/status` | `forms:update` + Admin | `published` requires `formPublishProblems` to be empty; `closed`; back to `draft` only if no submissions |
| `PATCH /:id/archive` | `forms:update` | `{ archived: boolean }` |
| `POST /:id/duplicate` | `forms:create` | copies as a new draft with a `-copy` slug |
| `POST /:id/preview` | `forms:read` | `PreviewLink` (D10) |
| `DELETE /:id` | `forms:delete` | 409 once any submission exists |

Public `/api/forms` (unauthenticated; published, non-archived forms only):

| Method & path | Limiter | Notes |
| --- | --- | --- |
| `GET /preview` | global | header `x-preview-token` → `PublicForm` (any status) |
| `GET /:slug` | global | `PublicForm`; 404 when draft/archived; `window` tells the page if it is not yet open or closed |
| `POST /:slug/draft` | `formDraftRateLimit` | creates the in-progress record → `{ token, draft }`; 409 when not open or `submissionLimit` reached |
| `GET /:slug/draft` | `formDraftRateLimit` | header `x-draft-token` → `ApplicantDraft` (404 on bad/expired token; same answer either way) |
| `PATCH /:slug/draft` | `formDraftRateLimit` | autosave `{ answers, currentStepId? }`, draft-mode validation, refreshes expiry |
| `POST /:slug/draft/uploads/sign` | `formUploadRateLimit` | `{ fieldId, filename, bytes }` → `SignedApplicationUpload` (D7) |
| `POST /:slug/draft/submit` | `formSubmitRateLimit` | full validation against the current version; verifies files; stamps consent; creates reference; emails (D12) → `SubmissionReceipt` |
| `POST /:slug/draft/resume-link` | `resumeLinkRateLimit` | always 202 (D8) |

Admin `/api/admin/applications`:

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /` | `applications:read` | `applicationListQuerySchema` (`formId`, `status` — never drafts, `q` on applicant name/email/reference, `from`, `to`, `sort`, paging) |
| `GET /counts` | `applications:read` | counts by status (for tabs and the nav badge of new `submitted`) |
| `GET /export` | `applications:read` | CSV for one `formId` (all pages, formula-injection guarded) |
| `GET /:id` | `applications:read` | `AdminApplication` with the version snapshot, reviewer names and signed file URLs |
| `PATCH /:id/status` | `applications:update` | `canChangeApplicationStatus`; appends `statusHistory`; audit |
| `POST /:id/reviews` | `applications:update` | internal review; audit |
| `DELETE /:id/reviews/:reviewId` | `applications:update` | own review only (or Admin) |

Privacy: `privacy-request.service.ts` export and erase include `FormSubmission` records (and drafts)
matched on `applicant.email`, and erasure destroys their Cloudinary files best-effort.

### 3.5 Impact stories

Admin `/api/admin/impact-stories`:

| Method & path | Permission | Notes |
| --- | --- | --- |
| `GET /` | `impact-stories:read` | `impactStoryListQuerySchema` (`q`, `status` or `view=drafts|published`, `projectId`, `programme`, paging) |
| `POST /` | `impact-stories:create` | |
| `POST /from-project/:projectId` | `impact-stories:create` + `projects:read` | `storyFromProject` prefill: title, excerpt from summary, cover, hero, rich-text description, metrics, partners, **shareable** media only as a gallery; copies, never live references |
| `GET /:id` | `impact-stories:read` | |
| `PATCH /:id` | `impact-stories:update` | |
| `PATCH /:id/status` | `impact-stories:update` (+ Admin for `published`, unpublish and `archived`) | `storyPublishProblems` must be empty to publish; sets `publishedAt` on first publish |
| `POST /:id/preview` | `impact-stories:read` | `PreviewLink` |
| `DELETE /:id` | `impact-stories:delete` | only when never published |

Public `/api/impact-stories` (published only): `GET /` (`programme`, `country`, `tag`, paging →
`Paginated<PublicImpactStoryListItem>`), `GET /preview` (header token), `GET /:slug` →
`PublicImpactStory`. Mount order: `/preview` before `/:slug`.

---

## 4. Admin (`apps/admin/src`)

### 4.1 Navigation

New sidebar groups between Overview and Content:

- **Work:** Projects (`/projects`), Tasks (`/tasks`, badge = my overdue + due today).
- **Applications:** Forms (`/forms`), Applications (`/applications`, badge = new submissions), Review
  queue (`/applications/review`).
- **Content:** gains **Impact stories** (`/impact-stories`); the CMS `stories` item is relabelled
  **Testimonials**.

Each item is hidden without `<key>:read` (path-derived `mayRead`).

### 4.2 Shared admin pieces (foundation)

| Piece | Path | Purpose |
| --- | --- | --- |
| `UserPicker` | `components/people/UserPicker.tsx` | Autocomplete (single or multiple) over `/admin/people`, chips with initials |
| People hooks | `lib/people.ts` | `usePeopleSearch(q)`, `usePeople(ids)` |
| `DateField` | `components/fields/DateField.tsx` | themed MUI X DatePicker for calendar dates (D6) |
| `ConfirmDialog` | `components/dialogs/ConfirmDialog.tsx` | destructive confirm naming the record (Events pattern) |
| `DetailSection` | `components/detail/DetailSection.tsx` | card section with tinted header (EventDetail pattern) |
| `DetailTabs` | `components/detail/DetailTabs.tsx` | routable `NavLink` tabs + `<Outlet/>` (AccountLayout pattern), scrollable on mobile |
| `ActivityTimeline` | `components/audit/ActivityTimeline.tsx` | renders `AuditEvent`s from an endpoint, server-paged |
| `FileAttachmentList` | `components/files/FileAttachmentList.tsx` + `FileUploadButton.tsx` | list/upload/remove documents & attachments (`register: false`) |
| `ServerPagination` | `components/data/ServerPagination.tsx` | MUI Pagination bound to `page` search param, focus moves to heading |
| Debounce | `lib/use-debounced-value.ts` | |
| Options | `lib/select-options.tsx` | status/priority/type/field-type/block-type/recommendation options with descriptions and icons |
| Guides | `lib/page-guides.ts` | help for every new page |
| Uploads | `lib/cloudinary.ts` | `register` and `profile` options (D7) |
| Test env | `vite.config.ts` `test.env.VITE_API_URL` | lets tests that import the API client load in CI |

### 4.3 Pages and ownership

| Module | Pages (`pages/<module>/`) | Components | Hooks |
| --- | --- | --- | --- |
| Projects | `ProjectsPage` (All / My / Archived tabs, table+card views, server paging), `ProjectEditorPage` (stepwise: Basics · People · Schedule & place · Scope · Story & cover · Review), `ProjectDetailLayout` + tabs `ProjectOverviewTab`, `ProjectTasksTab`, `ProjectMilestonesTab`, `ProjectMediaTab`, `ProjectImpactTab`, `ProjectDocumentsTab`, `ProjectActivityTab` | `components/projects/*` | `lib/projects.ts` |
| Tasks | `MyTasksPage` (Overdue / Today / Upcoming / No date), `AllTasksPage` (filters, server paging), `TaskBoardPage` (dnd-kit Kanban), `TaskEditorPage` (stepwise: Basics · Assignment · Schedule · Details · Review), `TaskDetailPage` | `components/tasks/*`: `TaskDrawer` (opened by `?task=<key>` on any task page), `QuickCreateTaskDialog` (≤5 fields, opened from the top bar and project Tasks tab), `ProjectTasksPanel`, `TaskComments`, `TaskChecklist`, `TaskStatusChip`, `TaskPriorityChip` | `lib/tasks.ts` |
| Forms | `FormsPage`, `FormEditorPage` (stepwise: Basics · Introduction · Questions (builder) · Schedule & limits · Confirmation · Review), `FormDetailPage` (summary, publish/close, preview, share link, submissions count) | `components/form-builder/*`: `FormBuilder` (steps + fields, dnd + up/down), `FieldEditor`, `VisibilityRuleEditor`, `FieldPreview` | `lib/forms.ts` |
| Applications | `ApplicationsPage` (status tabs, form filter, search, server paging, CSV export), `ReviewQueuePage`, `ApplicationDetailPage` (answers in form order, files, reviews, status change with note, history) | `components/applications/*` | `lib/applications.ts` |
| Impact stories | `ImpactStoriesPage` (Drafts / Published tabs), `ImpactStoryEditorPage` (stepwise: Basics · Classification · Blocks · Search & sharing · Review with preview), `StoryFromProjectPage` (creates then redirects) | `components/impact-stories/*`: `BlockEditor`, one editor per block type (a `Record<BlockType, Component>` map), `ProjectStoriesPanel` | `lib/impact-stories.ts` |

Cross-module contracts (placeholders created by the foundation, implemented by the owner):

- `components/tasks/ProjectTasksPanel.tsx` — `({ projectId }: { projectId: string })`, rendered by the
  project Tasks tab.
- `components/impact-stories/ProjectStoriesPanel.tsx` — `({ projectId }: { projectId: string })`,
  rendered by the project Impact tab; it offers "Create impact story", which navigates to
  `/impact-stories/from-project/:projectId`.
- `components/tasks/QuickCreateTaskButton.tsx` — top-bar button placed by the foundation in `AppShell`.

Rules for every editor page: AGENTS.md stepwise rules (FormStepNavigation, Enter advances, validate the
current step, whole form on save, return to the failing step, lock while uploading or saving, same flow
for create and edit, skeleton loader with Retry). Inline edits in the task drawer save immediately
(single-value preferences are not multi-field forms). Missing permissions are said out loud with who can
grant them. New flows are added to `docs/design/forms.md`.

### 4.4 Dashboard

A "Your work" panel on `pages/Dashboard.tsx`: my overdue / due today / upcoming tasks (link to My tasks),
active projects, new applications (only with `applications:read`), stories in review. Each tile is
permission-gated.

---

## 5. Marketing (`apps/marketing/src`)

| Route | Page | Notes |
| --- | --- | --- |
| `/impact/stories` | `pages/ImpactStories.tsx` | published stories; programme / country filters only when stories carry them; empty state; `Seo` |
| `/impact/stories/:slug` | `pages/ImpactStory.tsx` | block renderers (`features/impact-stories/blocks/*`, a `Record<type, Component>` map), responsive Cloudinary images (`lib/cloudinary-image.ts`: `f_auto,q_auto,w_…` srcset), lazy galleries, `Seo type="article"`, `ArticleSchema` JSON-LD, not-found with `noindex` |
| `/impact/stories/preview` | `pages/ImpactStoryPreview.tsx` | fragment token, `noindex`, preview ribbon |
| `/apply/:slug` | `pages/Apply.tsx` | immersive applicant flow, **outside** `Layout` (minimal chrome) |
| `/apply/preview` | `pages/ApplyPreview.tsx` | same renderer, no drafts or submit |

- Nav: "Impact stories" under Our Work in `components/layout/SiteNavigation.tsx`; Home "Read more
  stories" and Impact "Read their stories" point to `/impact/stories`.
- Crawlers: `api/story-meta.ts` (shared helpers moved to `api/_lib/preview.ts`, with a fetch timeout
  and a try around the shell fetch) and a `vercel.json` rewrite for `/impact/stories/:slug` placed
  before the catch-all.
- Sitemap: `/impact/stories` static route and published story slugs from `/impact-stories` in
  `tools/generate-sitemap.mjs`.
- API client: `apiRequest` gains a `headers` option (foundation).

### 5.1 Immersive applicant experience (`features/applications/*`)

- Cover slide (intro heading, description, image, window/closing date) → **Begin**.
- One step (question group) per screen; long steps scroll. Step and field visibility from the shared
  helpers. Progress "Step x of y" plus a bar.
- Transitions with `AnimatePresence` + `m.*` using the site's motion tokens (rise and settle, nothing
  sideways); `useReducedMotion` swaps to opacity or none.
- Keyboard: Enter advances from single-line fields, never from long text; focus moves to the step
  heading on each change; Back / Continue buttons always visible; large type.
- Autosave (when allowed) debounced 1.5 s after a meaningful change, plus on step change, with a live
  status "Saving… / Saved just now / Couldn't save — retrying" and exponential retry for the sleeping
  API. Resume from stored token or `#resume=` fragment; "Email me a link to finish later".
- Uploads: allowed types and size shown up front, XHR progress, retry, remove.
- Validation per step with the shared validators; server errors map back to their step.
- Review screen listing every visible answer with Edit links → Submit → confirmation with the
  reference and success message.
- States: not yet open, closed, not found, submission limit reached, network error with retry.

---

## 6. Build order and file ownership

The work runs in phases on one branch. Within a phase, agents own disjoint paths; only the
foundation touches shared registration files.

| Phase | What | Owner paths |
| --- | --- | --- |
| 0 | Discovery and this plan | `docs/IAA_EXPANSION_*.md` |
| F | Foundation: all shared contracts and their tests, all models, audit, people, counters, preview tokens, rate limiters, media profiles, task-events boundary, index sync, router stubs mounted in `app.ts`; admin shared pieces, nav, route stubs and placeholder pages, dnd-kit, options, guides, test env; marketing route stubs and api-client headers | registration files: `packages/shared/src/{enums.ts,schemas/index.ts}`, `apps/api/src/{app.ts,container.ts,tokens.ts}`, `apps/admin/src/{app/App.tsx,components/layout/*,lib/select-options.tsx,lib/page-guides.ts}`, `apps/marketing/src/{app/App.tsx,lib/api-client.ts}` |
| 1 | Projects + Tasks | `modules/projects`, `modules/tasks`, `pages/projects`, `pages/tasks`, `components/projects`, `components/tasks`, `lib/projects.ts`, `lib/tasks.ts` |
| 2 | Forms + Applications (+ privacy hook) and the applicant experience | `modules/forms`, `pages/forms`, `pages/applications`, `components/form-builder`, `components/applications`, `lib/forms.ts`, `lib/applications.ts`, `modules/privacy/privacy-request.service.ts`; marketing `features/applications`, `pages/Apply*.tsx` |
| 3 | Impact stories (admin + public) | `modules/impact-stories`, `pages/impact-stories`, `components/impact-stories`, `lib/impact-stories.ts`; marketing `features/impact-stories`, `pages/ImpactStor*.tsx`, `api/*`, `vercel.json`, `SiteNavigation.tsx`, Home/Impact CTAs, `tools/generate-sitemap.mjs` |
| 4 | Hardening: authorisation review, validation and security, accessibility, indexes and performance, cross-module end-to-end tests, dashboard panel, documentation | as found |

Phases 1–3 can be built in parallel once F lands, because each owns its paths and the models and
contracts already exist.

---

## 7. Testing

- **Shared (unit):** schema contracts (every `*UpdateSchema` parses `{}` — the existing reflection test
  covers them), transitions, `computeProjectProgress`, `dueBucket`, `boardOrderBetween`, visibility and
  answer validation (all field types, hidden-required, file answers), `formPublishProblems`,
  `storyPublishProblems`, `videoEmbedUrl`, `storyFromProject`, calendar-date helpers.
- **API (unit):** services with stubbed models (existing pattern).
- **API (integration, `test/integration/`):** per module — 401 without a token, 403 per missing
  permission (and the Admin-only publish steps for editors), 400 `VALIDATION_ERROR`, 404, 409 (slug,
  delete refusals), CRUD, public visibility (drafts and archived never public), draft token flow
  (bad token, expired, submitted), submit validation against the definition, review and status
  history, publish flow. Keep logins per file under the shared login limiter.
- **End to end (API level, `test/integration/expansion-flows.test.ts`):** create project → create and
  assign tasks → complete them (progress moves) → create story from project → publish → public list
  and detail show it, draft invisible; create speaker form from template → publish → public draft →
  autosave → submit → admin lists it → review → status changes → history.
- **Admin / marketing (component):** stepwise editors (step validation, Enter advances, save keeps the
  form on error), board move rollback, builder add/reorder/visibility, applicant flow (visibility,
  validation, review screen, reduced motion), story block rendering.
- **Regression:** the existing suites stay green; the submissions 403 sweep is extended with the new
  admin paths; `app-assembly.test.ts` covers the new routers.
- Gates after each phase: `npm run build:shared && npm run lint && npm run typecheck &&
  npm test -- --maxWorkers=2 && npm run build && git diff --check`. Format touched files only
  (`node node_modules/prettier/bin/prettier.cjs --write <files>`).

---

## 8. Configuration and deployment

- **No new required environment variables.** Links use `PUBLIC_SITE_URL` and `ADMIN_URL`; previews
  use the JWT access secret; applicant emails use the existing Resend configuration.
- **Vercel (marketing):** `api/story-meta.ts` is picked up automatically; the rewrite ships in
  `vercel.json`.
- **After deploying the API, per environment:**
  1. `npm run indexes:sync -w @iaa/api` (dry run), then with `-- --confirm`.
  2. `npm run build:shared && node tools/sync-user-permissions.mjs --env <file>` (dry run), then
     `--confirm`.
  3. Ask staff to sign out and in (or wait 15 minutes) so their tokens carry the new permissions.
- Cloudinary: authenticated delivery must be available on the account for applicant files (it is on
  standard plans). If it is not, set the field's accepted kinds to what can be public and note it.

---

## 9. Acceptance criteria mapping (spec §14)

| Area | Where it is satisfied |
| --- | --- |
| Projects | §3.2, §4.3 Projects; tests in `projects.test.ts` and the flow test |
| Tasks | §3.3, §4.3 Tasks (My tasks, list, board, drawer, comments, checklist, attachments) |
| Forms | §3.4, form builder with visibility rules, preview (D10), publish/close |
| Applicant UX | §5.1, drafts/resume (D8), uploads (D7), review screen |
| Review | Applications pages, reviews, status history, audit |
| Stories | §3.5, from-project prefill, block editor, preview, publish, independent edits |
| Public site | §5, published-only API, SEO (`Seo`, JSON-LD, crawler meta, sitemap) |
| Integration | existing auth/RBAC/shell untouched except additive keys; regression suites |

---

## 10. Non-goals (spec §18, plus V1 scope decisions)

- Replacing the admin, RBAC, auth or MongoDB; donor CRM, payroll, HRIS, accounting; sprint points and
  velocity; AI-generated impact claims or automatic publication; a general-purpose form SaaS.
- Budget ledger: no budget fields in V1 (spec: "only if required now").
- Record-level visibility (members-only projects, private tasks).
- Email / in-app task notifications and due reminders (boundary only, D12).
- Migrating the fixed contact/partner/volunteer/job forms or event questionnaires onto the builder.
- Scheduled publishing of stories.

## 11. Later phases

1. Task notifications: in-app notification collection + email, fed by `TaskEventPublisher`; due-date
   reminders as another branch of `/api/automations/run`.
2. Record-level project visibility if IAA needs private projects.
3. Move the volunteer/mentor/partner forms onto the builder; share the field renderer with event
   registration.
4. Applicant status emails from templates.
5. A `publish` permission action with per-resource columns in the matrix, if publishing must be
   delegated to non-admins.

---

## 12. Progress log

| Date | Phase | Status | Notes |
| --- | --- | --- | --- |
| 2026-09-27 | 0 Discovery + plan | Done | This document and `IAA_EXPANSION_DISCOVERY.md` |
