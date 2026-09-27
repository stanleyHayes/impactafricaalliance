# IAA admin platform expansion: repository discovery

This is the Phase 0 discovery document required by §2 of the Admin Platform Expansion specification.
It maps what exists today and decides nothing. Decisions live in
[`IAA_EXPANSION_PLAN.md`](IAA_EXPANSION_PLAN.md). Section 14 lists the questions this map forces.

- **Snapshot:** branch `feat/admin-platform-expansion` at `0845e9d`, 27 September 2026.
- **Method:** nine area reports, a tenth that checked them against the code (its version wins), and
  headline claims re-run by command: versions, CI history, raw `.parse()` sites, env drift.
- **Not verified:** anything needing production access. See the end of §14.

Paths are repo-relative, except that §7 and §9 state a base folder and a bare file name repeats a
file cited in full nearby. `path:line` points at the line or range that supports the claim.

## 1. Summary

- **Stack.** npm workspaces: `apps/api` (Express 5.2.1, Mongoose 9.7.4, tsyringe 4.10.0, zod 4.4.3),
  `apps/admin` and `apps/marketing` (React 19.2.7, Vite 8.1.4, MUI 9.2.0, TanStack Query 5.101.2),
  and `packages/shared` (zod schemas, enums and utils, built with `tsc`). TypeScript 6.0.3 and
  Vitest 4.1.10 throughout.
- **Topology.** API on Render's free plan, which sleeps when idle. Admin and marketing are separate
  Vercel projects serving client-rendered SPAs. A GitHub Actions cron calls
  `POST /api/automations/run` hourly.
- **Database.** MongoDB through Mongoose 9. No migrations framework, soft delete, `schemaVersion` or
  optimistic concurrency. `autoIndex` is off in production and nothing else builds indexes.
- **RBAC.** Two roles and four actions. Permissions are stored per user and copied into the JWT, so
  a new resource needs a backfill and grants arrive up to 15 minutes late.
- **Collisions.** `stories`, `submissions` and `reviews` already exist as resource keys, API paths
  and admin routes. The testimonial `Story` resource is already labelled "Impact Stories".
- **URLs.** Public routes are `/api/<x>`, admin routes `/api/admin/<x>`. There is no `/api/public`.
- **Prior art.** The event questionnaire for forms; the article publish hook and the `event-meta`
  Vercel function for stories.
- **Gaps.** No audit log, notifications, editor-accessible user directory, drag-and-drop, search,
  drawer, confirm dialog, global toast or record-level authorisation.
- **Public uploads are broken.** Marketing calls `/api/media/sign-cv`; the signer is mounted only
  under `/api/admin/media`, so every CV upload gets 404.
- **One shared rate-limit bucket.** 20 requests per 15 minutes per IP covers login, `/auth/refresh`,
  AI assist and every public form POST. Filling it logs staff out.
- **Validation bug class.** Ten handlers call `schema.parse()` directly and return 500 on bad input.
- **CI has never passed:** 94 runs, 0 successes. Lint and typecheck pass locally.
- **Privacy gaps.** Export and erasure already miss event registrations and reviews.

## 2. Frameworks and versions

Versions are those installed in `node_modules`.

| Workspace | Runtime | Tooling and tests |
| --- | --- | --- |
| `apps/admin` | react 19.2.7, react-router-dom 7.18.1, @mui/material 9.2.0, @mui/x-data-grid 9.9.0 (MIT), @mui/x-date-pickers 9.13.0 + dayjs 1.11.23, @tanstack/react-query 5.101.2, react-hook-form 7.81.0, zod 4.4.3, react-markdown 10.1.0 + remark-gfm 4.0.1 | vite 8.1.4, vitest 4.1.10, jsdom 29.1.1, @testing-library/react 16 (no `user-event`; tests use `fireEvent`) |
| `apps/marketing` | The same React, Router, MUI, Query, RHF and zod, plus framer-motion 12.42.2, react-intersection-observer 10.1.0, Stripe Elements. No date pickers | vite 8.1.4, vitest 4.1.10, @testing-library/user-event 14.6.1 |
| `apps/api` | express 5.2.1, mongoose 9.7.4, tsyringe 4.10.0, zod 4.4.3, pino 10.3.1, pino-http 11.0.0, express-rate-limit 8.5.2, helmet 8.3.0, cors 2.8.6, jsonwebtoken 9.0.3, bcryptjs 3.0.3, otpauth 9.5.1, cloudinary 2.10.0, resend 6.17.2, stripe 22.3.1, @anthropic-ai/sdk 0.111.0 | tsx 4.23.0, vitest 4.1.10, supertest 7.2.2, mongodb-memory-server 11.2.0 |
| `packages/shared` | zod 4.4.3 only | `tsc` to `dist`, vitest |

- **npm, not pnpm.** `package-lock.json` (lockfileVersion 3) is the only lockfile, and CI, Render
  and the README use `npm ci`. The `"packageManager": "pnpm@11.11.0…"` field (`package.json:43`) is
  stale. Add dependencies with `npm install <pkg> -w @iaa/<workspace>`.
- **Node.** `engines` is `>=20.19` (`package.json:7-8`), CI uses 22, the local machine runs v26.5.0.
  Render's version is unpinned: no `.nvmrc`, `.node-version` or `NODE_VERSION`.
- **Lint and format.** ESLint 9.39.5 (the config header says 10) and Prettier 3.9.5.
- **Docs have drifted; trust the code.** `README.md:23` says React 18 and MUI v6.
  `docs/design/forms.md:29` says 24-hour time; pickers are 12-hour (`EventDateTimeField.tsx:45-47`).

**TypeScript flags that constrain new code** (`tsconfig.base.json`):

- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`,
  `exactOptionalPropertyTypes: false`.
- `apps/api/tsconfig.json` uses `NodeNext`, so relative imports need `.js`. It enables decorators
  and decorator metadata for tsyringe, and **excludes `**/*.test.ts`**. API and shared tests are
  never type-checked.
- Admin and marketing include only `src` and `vite.config.ts`, so `apps/marketing/api/*.ts` (Vercel
  functions) is not type-checked. Both alias `@mui/material/Stack` to a local shim; the barrel
  import bypasses it.
- Apps consume `@iaa/shared` from `dist`, not source. Run `npm run build:shared` after every shared
  change or types and tests go stale.

## 3. Deployment topology and configuration

| Surface | Host | Build | Serve |
| --- | --- | --- | --- |
| API | Render free plan, `oregon`, branch `main`, auto-deploy (`render.yaml`) | `npm ci --include=dev && npm run build:shared && npm run build -w @iaa/api` (`render.yaml:13`) | `node apps/api/dist/server.js`, health `/api/health` (`:14-15`) |
| Marketing | Vercel project rooted at `apps/marketing` | `npm run build:shared --prefix ../.. && npm run build`, which runs the sitemap `prebuild` | `dist`, plus two functions in `apps/marketing/api/` |
| Admin | Separate Vercel project rooted at `apps/admin` | Same pattern | `dist`, one SPA rewrite |
| Scheduler | `.github/workflows/automations.yml`, cron `0 * * * *` | | Wakes `/api/health`, then `POST /api/automations/run` |

- **Where env vars live.**
  - API: one zod schema over `process.env` (`apps/api/src/config/env.ts:42-131`), mapped into a
    hand-written `AppConfig` by `buildConfig` (`:135-196`, `:273-309`), injected as `TOKENS.Config`.
  - Production values: `render.yaml:17-187` (literals, `generateValue` for JWT and ingest secrets,
    `sync: false` for dashboard secrets), mirroring the gitignored `apps/api/.env.production`, which
    `tools/*.mjs` also load.
  - Vite: `VITE_API_URL` in both apps, `VITE_SITE_URL` in admin, GA4, Stripe and Paystack keys in
    marketing. Marketing functions read `API_URL` and `ANALYTICS_INGEST_SECRET`. CI reads
    `AUTOMATION_RUN_SECRET`, `SONAR_TOKEN` and `API_BASE_URL`.
- **A new API variable takes five edits:** schema, `AppConfig`, `buildConfig`, `render.yaml` and
  both `.env.example` files. The schema fails fast in production (`env.ts:14-31`), so a new required
  value needs a dev default or a production-only check.
- **`.env.example` is stale.** The root file lacks 16 of 56 schema keys, including
  `AUTOMATION_RUN_SECRET`, `ANALYTICS_INGEST_SECRET` and `ANTHROPIC_API_KEY`.
  `apps/api/.env.example` is a second, different copy.
- **CORS.** `CORS_ORIGINS` (`render.yaml:30-31`) allows the marketing and admin domains and both
  `*.vercel.app` hosts. `credentials: false` in every branch
  (`apps/api/src/common/cors.ts:23,29,32`) means no cookie session can reach the API.
- **Headers.** Only `/brand/*` and `/assets/*` get cache headers
  (`apps/marketing/vercel.json:9-18`). Neither app sets CSP or frame headers.
- **Sleep.** The API sleeps after about 15 idle minutes and takes 30-60 s to wake. The admin client
  wakes it before writes (§7); marketing and the Vercel functions do not. Render env changes need a
  deploy, not a restart. A paused Vercel project blocks deploys and keeps serving old code.

**CI status: never green.** `gh run list --workflow ci.yml`: 94 runs from 13 June to 24 September
2026, 90 failures, 4 cancelled, 0 successes. `ci.yml` runs only on push and pull request to `main`,
on Node 22: `npm ci`, `build:shared`, `lint`, `typecheck`, `test`, `build`.

- **Since `d80a234` (7 September)** the Test step fails. Four admin test files throw on import
  because `apps/admin/src/lib/api-client.ts:72-75` requires `VITE_API_URL`, which CI never sets.
  They pass locally because of the gitignored `apps/admin/.env`.
- **Before that,** the `sonarcloud` job failed in 1 s: `ci.yml:66-71` runs `--coverage`, and
  `@vitest/coverage-v8` is in no `package.json`. The SonarCloud scan has never run.
- Feature branches get no CI until a pull request exists. No git hook runs on commit.

## 4. MongoDB integration

- **Connection.** `apps/api/src/db/mongoose.ts:11-15`: `strictQuery: true`,
  `serverSelectionTimeoutMS: 10_000`, `autoIndex: !config.isProduction`.
- **`baseSchemaOptions`** (`apps/api/src/common/model-helpers.ts:20-32`): timestamps,
  `versionKey: false`, and `_id` mapped to `id` in JSON. Every model uses it except users, which
  strip secrets too (`apps/api/src/modules/users/user.model.ts:17-34`). With no version key,
  concurrent writes are last-write-wins.
- **`mediaSubSchema`** (`model-helpers.ts:4-13`): `{ url, publicId, width?, height?, alt? }`,
  `_id: false`. Content embeds this snapshot, never a media-library id.
- **Model files:** an `XDocument` interface, `new Schema<XDocument>(…, baseSchemaOptions)`, indexes
  each commented with the query served (`apps/api/src/modules/reviews/review.model.ts:52-65`), then
  `model<XDocument>('X', schema)`.
- **Embedded sub-arrays** use `_id: false` sub-schemas with a stable string `id`, as in the event
  `questionSubSchema` (`apps/api/src/modules/content/models/event.model.ts:42-52,86`). Registration
  answers are keyed by `questionId` with a denormalised `label`
  (`apps/api/src/modules/event-registrations/event-registration.model.ts:31-38`).
- **References.** Entities use `{ type: Schema.Types.ObjectId, ref, index: true }`
  (`review.model.ts:36`). Actors are **String** user ids: `Invitation.createdBy`
  (`apps/api/src/modules/users/invitation.model.ts:26`) and social `createdBy`, `approvedBy`,
  `rejectedBy` (`apps/api/src/modules/social/social-publication.model.ts:78-82`).
  `EventMessage.sentBy` is an email. Nothing calls `populate`. The user model is `'User'`.
- **Id checks.** Services use `Types.ObjectId.isValid`, which also accepts any 12-character string
  (`event-registration.service.ts:131`). The stricter `objectIdSchema`
  (`packages/shared/src/schemas/common.ts:18`) is used only for path and query params.
- **Enums** are lowercase kebab-case constants (`packages/shared/src/enums.ts:98-103`). Newer files
  keep status tuples beside their schema (`packages/shared/src/schemas/review.ts:12`). The spec's
  `IN_REVIEW` style matches neither.
- **Slugs** are `unique` and indexed (`apps/api/src/modules/content/models/story.model.ts:24`). Case
  is enforced only by `slugSchema` (1-120 chars, `^[a-z0-9]+(?:-[a-z0-9]+)*$`). The API has no
  slugify. Duplicates become 409.
- **Indexes.** Partial and compound unique indexes exist (`review.model.ts:55-65`; unique
  `{eventId, email}` at `event-registration.model.ts:63`, treated as an idempotent repeat).
  **Nothing builds them in production:** `autoIndex` is off and there is no `syncIndexes`,
  `createIndexes` or `ensureIndex` in `apps/api/src` or `tools/`. In tests, builds are asynchronous,
  so a 409 test must `await XModel.init()` first.
- **No migrations framework.** One-off changes are dated `tools/*.mjs` scripts such as
  `tools/migrate-campaigns-2026-09-08.mjs`, following `tools/sync-user-permissions.mjs:1-13`: dry
  run by default, `--confirm` to write, raw collections, `apps/api/.env.production` unless `--env`
  is given. `tools/` is not linted.
- **Seed.** `npm run seed` runs `apps/api/src/seed.ts`. `ensure` (`:835-843`) inserts only into
  empty collections, `upsertBySlug` (`:844-853`) upserts by slug, and users get `ROLE_TEMPLATES`
  (`:857-885`). It never backfills permissions and is not run on deploy.
- **No soft delete, archive or schema version.** A grep for
  `archivedAt|deletedAt|schemaVersion|softDelete` finds nothing. Every delete is hard
  (`apps/api/src/common/crud/content-repository.ts:52-55`,
  `apps/api/src/modules/reviews/review.service.ts:393-398`). `SubmissionStatus.Archived` rows are
  hard-deleted later (`apps/api/src/modules/privacy/retention.service.ts:32-35`).
- **Clearing depends on the service.** `EventContentService.update` turns `null` into `$unset` for
  its `CLEARABLE` list only (`apps/api/src/modules/content/event-content.service.ts:8-16,37-51`).
  Generic `ContentRepository.update` stores `null` (`content-repository.ts:48-50`).
- **No counters, transactions or search.** No `$inc` counter, `startSession` or `withTransaction`.
  Tests use a standalone `MongoMemoryServer` without transactions (`apps/api/test/harness.ts:30`).
  No `$regex` or `$text`; filters are exact enum matches
  (`apps/api/src/modules/submissions/submission.repository.ts:20-37`). `strictQuery` silently drops
  unknown filter keys, so a misspelt filter returns everything.

## 5. API architecture

**Mount order** (`apps/api/src/app.ts:35-114`):

| Lines | Mount | Note |
| --- | --- | --- |
| 41-47 | `trust proxy`, `helmet`, `cors`, `compression`, `pinoHttp` | Rate limits key on IP |
| 51-52 | `/api/payments/webhooks` | Before the JSON parser, to keep the raw body |
| 54-55 | `express.json({ limit: '1mb' })`, `sanitizeBody` | Every JSON body is capped at 1 MB |
| 57-58 | `/api/health`, then `globalRateLimit` on `/api` | |
| 60-63 | `/api/auth`, `/api/automations`, `/api/live` | |
| 65-70 | 16 generic content modules at `/api/<path>` and `/api/admin/<path>` | From `content.registry.ts` |
| 72-108 | Bespoke routers: registrations, messages, submissions, reviews, analytics, users, dashboard, invitations, media, AI, payments, privacy, site settings, social | |
| 110-111 | `notFoundHandler`, `errorMiddleware` | Must stay last |

- **URL convention.** Bespoke modules export `createXRouters(container)` returning
  `{ publicRouter, adminRouter }` (`apps/api/src/modules/reviews/review.routes.ts:27-29`).
- **Route collisions.** Routers on one prefix are tried in mount order, so a generic `GET /:id`
  swallows sibling paths. That is why registration admin routes live at
  `/api/admin/event-registrations`
  (`apps/api/src/modules/event-registrations/event-registration.routes.ts:33-34`).
- **tsyringe rules** (`apps/api/src/tokens.ts:1-15`, `apps/api/src/container.ts:20-33`).
  - Interfaces are injected by token (`Config`, `Logger`, `EmailProvider`, `MediaProvider`, two
    payment gateways); concrete classes by class. Every parameter has an explicit `@inject(...)`.
  - Services are not registered, so each `resolve` is a new instance; routers resolve once at mount.
    Keep no state on a service. The container is a child, so tests can override providers.
  - `max-params: 4` applies to constructors. Five or more dependencies take
    `// eslint-disable-next-line max-params` (`apps/api/src/modules/auth/auth.service.ts:38`).
- **Generic CRUD engine.** A `mountContentModule` entry in
  `apps/api/src/modules/content/content.registry.ts:62-249` generates public `GET /` and `GET /:key`
  and admin `GET/POST/PATCH/DELETE`, guarded by `requireAuth`, `requireRole(Admin, Editor)` and
  `requirePermissionFor(def.path as AdminResource)`
  (`apps/api/src/common/crud/content-module.ts:69-79`). Limits:
  - Public filter `{ status: 'published' }` (`:48`). Public lists take only `page` and `pageSize`;
    admin lists understand only `?status=` (`content-controller.ts:49-57`).
  - `req.user` never reaches the service: no `createdBy` or `updatedBy`. Hard delete, no
    sub-resources, no search.
  - `path` is cast to `AdminResource`, so a missing key compiles and then 403s for everyone.
  - Customisation is by `serviceFactory` subclass (`ArticlePublishingService`,
    `EventContentService`).
- **Hand-written modules.** `submissions`, `privacy`, `payments`, `users` and `social` have model,
  repository, service, controller (injectable, arrow handlers) and routes. `reviews`,
  `event-messages` and `analytics` have model, service and routes with inline handlers.
- **Errors.** `AppError` subclasses (`apps/api/src/common/errors.ts`): Validation 400, Unauthorized
  401, MfaRequired 401, Forbidden 403, NotFound 404, Conflict 409, ServiceUnavailable 503.
  `normalise` (`apps/api/src/common/error-middleware.ts:16-33`) maps malformed JSON, Mongoose
  validation and `CastError` to 400 (a bad admin id is 400, not 404) and duplicate key 11000 to 409.
  Anything else is 500 `INTERNAL_ERROR`.
- **Error envelope:** `{ "error": { "code", "message", "details"? } }`
  (`packages/shared/src/schemas/common.ts:46-52`). Rate-limit rejections use it with `RATE_LIMITED`.
- **`parseWith`, never raw `parse`.** `parseWith` (`apps/api/src/common/validate.ts:20-32`) gives
  400 `VALIDATION_ERROR` with `details: [{ path, message }]`. With no `ZodError` branch in
  `normalise`, a raw `schema.parse()` gives 500. Ten handlers do this (§12). It is a bug, not a
  convention.
- **Pagination:** `Paginated<T> = { items, page, pageSize, total, totalPages }` from `paginate()`
  (`apps/api/src/common/pagination.ts:4-15`); `paginationQuerySchema` defaults to page 1, size 20,
  maximum 100. Exceptions: reviews parse `page` by hand (`review.routes.ts:25`), and
  `GET /api/admin/users` returns a bare array
  (`apps/api/src/modules/users/user.controller.ts:15-17`).
- **Validation.**
  - Every PATCH schema is built with `partialForUpdate()`
    (`packages/shared/src/schemas/update.ts:20-30`), because `.partial()` keeps defaults.
    `update.test.ts` checks every `*UpdateSchema` export parses `{}` to `{}`. Two traps survive it:
    `.default().optional()`, and defaults inside nested objects.
  - `clearableDate` (`common.ts:13-16`) accepts `''`, `null` or a full ISO datetime, never a
    date-only string.
  - `sanitizeBody` (`apps/api/src/middleware/sanitize.ts:17`) drops body keys that start with `$` or
    contain `.`, silently.
  - No HTML sanitiser. Rich text is Markdown rendered without `rehype-raw`. Email HTML uses an
    `escapeHtml` copied into four services.
- **Rate limiters** (`apps/api/src/middleware/rate-limit.ts`, in-memory, per IP).
  - `globalRateLimit` 120/min on `/api` (`:17-25`); `webhookRateLimit` 60/min (`:28-36`).
  - `sensitiveRateLimit` 20 per 15 minutes (`:6-14`), **one instance shared by every route that uses
    it**: login, refresh, password reset, invitation, change password, MFA, AI assist, submissions,
    subscribe, unsubscribe, event registration, four review POSTs, privacy requests, donations and
    `sign-cv`.
  - `/auth/refresh` is in that bucket (`apps/api/src/modules/auth/auth.routes.ts:22`), and the admin
    clears tokens on any failed refresh (`apps/admin/src/lib/api-client.ts:268-270`). A 429 there
    ends the session. Staff behind one office IP share the 20.
- **Logging.** pino 10 redacting auth headers, cookies, passwords and secrets
  (`apps/api/src/config/logger.ts:6-19`); `pino-http` with defaults. `req.id` is an unused integer
  and `X-Request-Id` is ignored. Services log through the root logger with no request context, as
  `logger.error({ err: error, eventId }, 'Message')`.
- **Email.** `EmailProvider.send({ to, subject, html, replyTo?, attachments? })` over Resend
  (`apps/api/src/providers/email.provider.ts:9-28`). Without `RESEND_API_KEY` it logs and returns;
  with it, failures throw `ServiceUnavailableError`. Callers catch so the write never fails
  (`event-registration.service.ts:184-240`). No template engine, queue or batch send.
- **Automations.** `POST /api/automations/run` checks `x-automation-secret` in constant time (404 on
  mismatch), runs `runReviewInvites` and `runEventAutomation` in `Promise.all`, and answers 200 only
  if both succeed, else 207 (`apps/api/src/modules/automations/automation.routes.ts:62-81`). The
  workflow fails on anything but 200. `apps/api/src/server.ts:25-28` also starts four `setInterval`
  workers that rarely fire while Render sleeps. Retention and social publishing rely on them alone.

## 6. Authentication and RBAC

- **Sessions.** HS256 access token (900 s) and rotating refresh token (30 days)
  (`apps/api/src/config/env.ts:72-73`). Refresh hashes live on the user, capped at 10, with family
  revocation on reuse (`apps/api/src/modules/users/user.repository.ts:55-89`). The admin keeps
  tokens in `localStorage`.
- **MFA.** TOTP, AES-256-GCM secrets, eight bcrypt recovery codes
  (`apps/api/src/modules/auth/mfa.service.ts:61-108`). `MFA_REQUIRED_FOR_ROLES=admin` is set, but
  `isMfaRequiredForRole` (`auth.service.ts:237`) has no caller.
- **Invitations.** Hashed single-use tokens valid seven days, each with a permission snapshot
  (`apps/api/src/modules/users/invitation.service.ts:54-56`).
- **Permissions are stored per user and embedded in the JWT.** `resolvePermissions` returns the
  stored array, or `ROLE_TEMPLATES[role]` only when it is empty (`auth.service.ts:270-272`), so "no
  permissions" cannot be stored. `requireAuth` never reads the database (`token.service.ts:54-69`),
  so a deactivated user's token works for up to 15 minutes.
- **Vocabulary** (`packages/shared/src/enums.ts`). Roles `admin` and `editor` only (`:7-12`).
  Actions `read`, `create`, `update`, `delete` only (`:14-21`); the spec's `publish`, `assign`,
  `review` and `archive` do not exist. `Permission` is `` `${AdminResource}:${PermissionAction}` ``
  (`:53`). The `roles` key (`:48`) is used nowhere.
- **Editor template** (`enums.ts:62-91`). `read` on **every** resource, automatically (`:63`), so a
  new key holding applicant data is readable by every editor. `create` and `update` on the 20
  resources in `writeResources` (`:64-85`), including `media`. Never `delete`. Read-only for
  `site-images`, `media-library`, `donations`, `users` and `roles`.
- **Guards** (`apps/api/src/middleware/auth.middleware.ts`).
  - `requireAuth` (`:17-23`), `requireRole` (`:26-36`), `requirePermission` needing all (`:42-52`),
    and `requireAnyPermission` needing one (`:55-65`), which nothing uses.
  - `requirePermissionFor` (`:67-84`) maps GET, POST, PATCH and DELETE to read, create, update and
    delete. **PUT, HEAD and OPTIONS call `next()` unchecked.** A `POST /:id/publish` behind it needs
    `create`.
  - Standard preamble: `requireAuth` → `requireRole(Admin, Editor)` →
    `requirePermissionFor(AdminResource.X)`
    (`apps/api/src/modules/submissions/submission.routes.ts:32-37`). A sub-path with a different
    resource must mount before the router-wide guard.
  - Dashboard, analytics, AI and social routers check role only.
- **Backfill.** A new resource key changes `ROLE_TEMPLATES`, not stored arrays. Until backfilled,
  the API returns 403 to everyone, admins included, and the admin hides the nav item. Run
  `npm run build:shared`, then `node tools/sync-user-permissions.mjs`, then again with `--confirm`,
  per environment. It only adds missing template permissions (`:53-70`), reads the built `dist`
  (`:16`), and skips pending invitations.
- **15-minute lag.** The admin refreshes only on 401, never 403
  (`apps/admin/src/lib/api-client.ts:294-304`). After a grant, `/auth/me` shows the new tab at once
  while the API refuses it until the access token expires (`docs/admin-actions-review.md:52-56`).
- **Absent:** record-level authorisation, organisations or teams, and an audit log. `TeamMember`
  (`packages/shared/src/schemas/team.ts:16-35`) is public content with no link to `User`.
- **No user directory for editors.** `/api/admin/users` applies `requireRole(Admin)` to the whole
  router (`apps/api/src/modules/users/user.routes.ts:21-22`), so editors' `users:read` is useless
  there. `findAll()` returns every field of every user, unpaged (`user.repository.ts:28-30`). The
  JWT has `sub`, `email`, `role` and `permissions`, but no name
  (`packages/shared/src/schemas/auth.ts:175-180`).
- **Admin UI.** `PermissionMatrix` rows come from `ADMIN_RESOURCES` and columns from
  `PERMISSION_ACTIONS` (`apps/admin/src/components/auth/PermissionMatrix.tsx:91,109`). A new key is
  a new row automatically; a new action is a column for every resource.

## 7. Admin application

Short paths in this section are relative to `apps/admin/src/`.

- **Routing** (`apps/admin/src/app/App.tsx`). Declarative `BrowserRouter`
  (`apps/admin/src/main.tsx:9,28`), so no `useBlocker`. Every page is imported eagerly (no
  `React.lazy`), and one `ErrorBoundary` sits at the root. Routes wrap pages in
  `RequirePermission resource action fallback={<Alert…>}` with `RequireRole` on create and edit
  (`App.tsx:188-235`). `useCan()` gates buttons (`apps/admin/src/auth/useCan.ts:6-17`).
- **Navigation.** `buildNavGroups` (`apps/admin/src/components/layout/nav-config.tsx:68`) builds
  five fixed groups. `mayRead` (`:151-159`) takes the **first URL segment as the permission key**,
  maps `content` to the second segment and `media` to `media-library`, hides donations from
  non-admins and always shows account, analytics and social connections. New top-level routes must
  equal their resource key or be mapped here. Badge counts come only from submissions.
- **Generic CMS.** `RESOURCES` (`apps/admin/src/resources/registry.tsx:188-639`) declares 14
  resources; `stories` is labelled "Impact Stories" (`:222`). More than five fields moves a resource
  to a routable stepwise page automatically (`apps/admin/src/resources/form-steps.ts:63-64`).
- **Two stepwise editor patterns.**
  - `apps/admin/src/pages/ResourceFormPage.tsx`: RHF, `zodResolver`, `shouldUnregister: false`
    (`:54-66`), steps mounted but hidden, forward moves validate all prior steps (`:89-117`), Enter
    advances until Review (`:150-157`), uploads and saves lock the form (`:85`), skeleton loader
    with 404-aware error and Retry (`:272-323`).
  - `apps/admin/src/pages/EventEditor.tsx` with `lib/event-form.ts`: plain state, per-step zod
    filtering, `null` for removed optionals, focus on the step heading.
  - Both use `apps/admin/src/components/forms/FormStepNavigation.tsx`
    (`{ steps, activeStep, maxStep?, onStepChange, disabled? }`). Flows are listed in
    `docs/design/forms.md`.
- **Fields.** `OptionSelect` is single-value; there is no multi-select or user picker. `TagsField`
  is the only `Autocomplete`. `EventDateTimeField` and `IsoDateTimeField` wrap MUI X
  `DateTimePicker`, 12-hour, emitting `null` on clear; no date-only wrapper. `MediaUploadField` has
  a drop zone and library picker but a spinner, not progress. `QuestionBuilder` has stable 8-hex ids
  and up/down reordering (`apps/admin/src/components/fields/QuestionBuilder.tsx:36-39,100-111`).
  `MarkdownEditor` embeds `AiAssistButton`; `Markdown` renders without `rehype-raw`.
- **Lists.** `apps/admin/src/components/data/DataTable.tsx` filters, searches and pages in the
  browser, and list hooks load everything with `fetchAllPages`. The server-paging pattern is outside
  it: `useReviews({page})` with MUI `Pagination` (`apps/admin/src/pages/Reviews.tsx:194-227`).
  `paginationMode="server"` is unused. The registrations CSV exports only the 25 loaded rows
  ("Export this page", `apps/admin/src/components/events/EventRegistrations.tsx:385`).
- **Dialogs, drawers, confirmations.** `components/dialogs/DialogShell.tsx` supplies header, footer
  and paper styles. The only drawers are navigation (`components/layout/AppShell.tsx:193-223`). No
  shared confirm: `window.confirm` (`components/crud/ResourceCard.tsx:72`), a bespoke dialog
  (`pages/Events.tsx:111-158`) and `RecordActions` delete mode. `Tabs` appear once; sub-navigation
  uses nested routes (`pages/account/AccountLayout.tsx`).
- **No drag-and-drop library** in any workspace. Reordering is up/down buttons plus integer `order`.
- **No global toast.** Pages use a local `Snackbar` and `Alert` (`pages/Dashboard.tsx:1484-1533`).
- **API client** (`apps/admin/src/lib/api-client.ts`). GET, POST, PATCH and DELETE with JSON bodies;
  no PUT (`:90-94`). GET, PATCH and DELETE retry after 2, 6 and 12 s on network failure; POST never
  (`:14,26,176`). Writes after five silent minutes first poll `/health` for up to 90 s. A 401
  triggers one shared refresh.
- **Queries.** Keys are arrays with the entity first (`['events']`, `['events', id]`,
  `['submissions', params]`), invalidated by prefix. `staleTime` 30 s, no refetch on focus, one
  retry on 5xx (`apps/admin/src/lib/query-client.ts:20-33`). No optimistic updates, infinite
  queries, autosave or unsaved-changes helper. Newer modules keep hooks in `lib/<module>.ts`.
- **Primitives.** `PageHeader`, `PageHelp` with `lib/page-guides.ts`, `EmptyState`,
  `InformationItem`, `PageSkeleton` variants, `RecordActions`, `ActionIcon`, `ViewToggle`, and
  `components/charts/` `BarChart` and `DonutChart`. `StatCard`, `Panel`, the detail-page `Section`
  and the registry column helpers are private. `initials()` is copied into five files.
- **Theme.** `apps/admin/src/theme/theme.ts`: four presets, IAA mint `#00D68B` and gold `#F5B800`,
  Fraunces and Outfit, a reduced-motion kill switch, `sx` styling.
- **Tests.** Colocated `*.test.tsx`, providers composed inline with no shared helper
  (`apps/admin/src/pages/EventEditor.test.tsx:50-66`); auth and the API client mocked by `vi.mock`.

## 8. Media and file storage

- **Provider.** Cloudinary only, by direct signed upload. The API never receives file bytes and uses
  only `utils.api_sign_request` (`apps/api/src/providers/media.provider.ts:48`), so it cannot
  verify, move or delete an uploaded file. No GridFS, S3 or R2.
- **What is signed.** `timestamp`, `folder` and `allowed_formats`. `max_file_size` is removed before
  signing (`:45-47`), so **size is enforced only on the client**. Signature reuse is bounded only by
  Cloudinary's timestamp window, not by repo code.
- **Limits.** Staff: `jpg,png,gif,webp,pdf` up to 5 MB. CVs: PDF up to 5 MB
  (`media.provider.ts:8-11`). Office documents and video are rejected.
- **Staff signer.** `POST /api/admin/media/sign` needs Admin or Editor and `media:create`
  (`apps/api/src/modules/media/media.routes.ts:18-26`) and takes no input. Every upload goes to the
  one folder `iaa` (`media.provider.ts:60-68`). The admin's `folder` argument only sets the
  `MediaItem.folder` shelf (`apps/admin/src/lib/cloudinary.ts:50-53,89-99`).
- **Admin client.** Uploads with `fetch` to `…/auto/upload?_origin=<origin>` (a CORS cache-poisoning
  workaround), so there is no progress. Images over 1.5 MB are re-encoded to WebP at 2400 px first.
- **Editors' uploads never reach the library.** `registerMediaItem` needs `media-library:create`,
  which editors lack, and swallows the 403 (`apps/admin/src/lib/media-library.ts:58-64`).
- **The public CV signer is unreachable.** `POST /sign-cv` is unauthenticated and rate-limited
  (`media.routes.ts:28-34`) but mounted only at `/api/admin/media` (`apps/api/src/app.ts:92`).
  Marketing calls `apiPost('/media/sign-cv')` (`apps/marketing/src/lib/cloudinary.ts:22-23`), gets
  404, and `apps/marketing/src/pages/JobApplication.tsx:181-205` shows it as a CV error.
- **Delivery is public.** No upload uses `authenticated` or `private` delivery. The server trusts
  client URLs: `resumeUrl` accepts any URL (`packages/shared/src/schemas/submission.ts:74-75`).
- **References.** Content embeds a `MediaAsset` snapshot
  (`packages/shared/src/schemas/common.ts:21-28`): article covers, story photos, event and gallery
  images, report files (`packages/shared/src/schemas/report.ts:19`).
- **Library.** `MediaItem` is an admin-only catalogue with unique `publicId`, tags, bytes and
  format. `MEDIA_FOLDERS` (`site, team, events, news, gallery, documents`;
  `packages/shared/src/schemas/media-item.ts:10-20`) are library shelves, not Cloudinary folders.

## 9. Marketing website

Short paths in this section are relative to `apps/marketing/`.

- **Architecture.** A client-rendered Vite SPA; no SSR or prerender. `src/main.tsx:7,23-27` nests
  the theme, `QueryClientProvider`, `LazyMotion features={domAnimation} strict` and a declarative
  `BrowserRouter`.
- **Routes.** 21 `lazy()` pages under one `<Route element={<Layout />}>` (`src/app/App.tsx`).
  `Layout` always renders the banners, header, footer, cookie banner, popup and chat button
  (`src/components/layout/Layout.tsx:18-49`). No `/impact/*` or public application route.
- **Data.** `src/lib/api-client.ts` sets only `Content-Type`: no custom headers, credentials, PUT or
  wake-and-retry. `src/lib/content-hooks.ts` has one `useQuery` hook per resource. Public lists take
  only `page` and `pageSize`, so filtered views fetch every page (`useEvents`). `usePageCopy` and
  site-image hooks fall back to in-code copy; CMS sections hide when empty.
- **SEO.**
  - `index.html` carries default tags, canonical `/` and Organization JSON-LD.
  - `src/components/Seo.tsx:56` updates tags in a `useEffect`, which non-JS crawlers never see.
    `src/components/EventSchema.tsx` is the per-entity JSON-LD pattern; no Article JSON-LD exists.
  - The only server step is the `/events/:id` rewrite (`vercel.json:5-8`) to `api/event-meta.ts`.
    It fetches the shell outside its try block (`:98`), calls the API with no timeout (`:102`), and
    caches with `s-maxage=300, stale-while-revalidate=86400` (`:112`).
  - Unknown slugs are soft 404s. `SchemaOrg` advertises a `/news?q=` search the site lacks.
- **Sitemap.** `tools/generate-sitemap.mjs` runs as `prebuild` with `|| true` and fetches events,
  articles and team (`:93-97`). On any failed fetch it keeps the old file and exits 1 (`:143-149`),
  which `|| true` hides: a resource that always fails freezes the sitemap. Only rebuilds refresh it.
- **Public forms.** Contact, partner and volunteer forms use RHF, shared zod schemas,
  `useSubmitForm` and `ConsentCheckbox` (`src/features/forms/ContactForm.tsx:19-120`). The job
  application's CV upload is broken (§8). No honeypot or captcha; only server rate limits.
- **Immersive precedent.** `src/features/events/EventRegistrationDialog.tsx:305-501` is a
  full-screen dialog asking one question per screen (steps from `registration-steps.ts` beside it),
  with progress, Enter to advance except in long text, focus management, per-step validation and a
  consent step. It has no route, autosave, resume, review screen, uploads, transitions or
  reduced-motion handling.
- **Tokens.**
  - Event review links carry a stateless HMAC of `{eventId, email}` keyed on the JWT access secret,
    with no expiry or revocation (`apps/api/src/modules/reviews/review.service.ts:62-68,138-162`).
  - Organisation-review and privacy `verificationToken`s are random but stored in plain text
    (`review.service.ts:230,241`; `apps/api/src/modules/privacy/privacy-request.model.ts:37-42`).
  - Only password reset stores a SHA-256 hash of a random token with an expiry
    (`apps/api/src/modules/auth/password-reset.service.ts:18,38-39`).
  - `apps/marketing/src/features/reviews/EventReviewSection.tsx` strips the token from the URL after
    use. GA4 sends full URLs, query strings included
    (`apps/marketing/src/components/layout/CookieBanner.tsx:35`).
- **Animation.** framer-motion via `m.*` only (`strict` makes `motion.*` throw); `domAnimation` has
  no layout or drag. Tokens in `src/theme/motion.ts`; reusable `PageTransition`, `SectionReveal`,
  `StaggerGrid` and hero-only `AnimatedHeading`. Reduced motion is handled per component, with no
  global guard: `scrollBehavior: 'smooth'` is unconditional (`src/theme/theme.ts:120`).
- **Images.** Raw Cloudinary URLs with `loading="lazy"`, no `srcset`, `sizes` or dimensions. Heroes
  are CSS backgrounds. The only transform helper is shared `variantFor`
  (`packages/shared/src/utils/social-media-variants.ts:30-51`). No lightbox or carousel.
- **Navigation.** Header `NAVIGATION` (`src/components/layout/SiteNavigation.tsx:42-108`); footer
  shared `PRIMARY_NAV` (`packages/shared/src/constants/content.ts:12-20`). "Read more stories"
  (`src/pages/Home.tsx:393`) and "Read their stories" (`src/pages/Impact.tsx:612`) link to `/news`.
- **Tests.** `renderWithProviders` (`src/test/test-utils.tsx:9-24`, no `LazyMotion`) and
  whole-module `vi.mock('../lib/content-hooks')`, so a component calling a new hook breaks every
  mock factory that lacks it. The `api/*.ts` functions have no tests.

## 10. Existing concepts that overlap the new modules

| Spec concept | Existing thing | Overlap verdict |
| --- | --- | --- |
| Impact Story | `Story` testimonial: `packages/shared/src/schemas/story.ts:10-38`, model `'Story'` (`apps/api/src/modules/content/models/story.model.ts:37`), `/api/stories` (`apps/api/src/modules/content/content.registry.ts:101-111`), `AdminResource.Stories`, admin resource labelled **"Impact Stories"** (`apps/admin/src/resources/registry.tsx:221-247`), marketing Home band via `useStories` | Strong name, route and permission collision; weak structural overlap. A person, quote and narrative with `draft\|published`; no blocks, project link, `seo` or review state. `ContentStatus` is shared by all content |
| Story publish step | `ArticlePublishingService` detects draft to published (`apps/api/src/modules/content/article-publishing.service.ts:10-54`); `Article` has title, slug, excerpt, cover, tags, `publishedAt` | Pattern to copy and nearest field shape |
| Applications inbox | `Submission` contact, partner, volunteer and job inbox (`apps/api/src/modules/submissions/submission.model.ts:11-39`, closed union at `packages/shared/src/schemas/submission.ts:79-84`), `/api/submissions`, admin Submissions, Partner enquiries, Mentor applications, bell and badges | Strong conceptual and name collision; no structural reuse. `payload: Mixed`, no versions, drafts or reviews, and privacy code queries `payload.email` |
| Application reviews | `Review` event and organisation ratings, `/api/reviews`, admin `/reviews`, `AdminResource.Reviews` | Name collision only. `ReviewQueue` tabs and reject dialog are reusable UI |
| Form builder | `EventQuestionType` (`packages/shared/src/enums.ts:183-191`), `eventQuestionSchema` (`packages/shared/src/schemas/event.ts:37-52`), `apps/admin/src/components/fields/QuestionBuilder.tsx`, answers `{questionId, label, value}` (`packages/shared/src/schemas/event-registration.ts:16-20`) | Closest prior art. No steps, validation or visibility rules, file or consent types, or versions. The server never checks answers against questions (`apps/api/src/modules/event-registrations/event-registration.service.ts:152-156`) |
| Immersive applicant flow | `apps/marketing/src/features/events/EventRegistrationDialog.tsx`, `registration-steps.ts` | Seed. Lacks route, autosave, resume, review, uploads and reduced motion |
| Draft resume token | Password reset: random, stored SHA-256 hash, one-hour expiry. Review HMAC (no expiry). Plain-text `verificationToken`s | Only password reset has the stored hash and expiry the spec's opaque token needs |
| Public applicant uploads | `/api/admin/media/sign-cv` | Unreachable today. No per-draft binding, verification or private delivery |
| Project documents, task attachments | `Report.file: mediaAssetSchema`, staff signer | Pattern exists. Images and PDF only; editors' uploads skip the library |
| Story gallery, project evidence | `GalleryItem` (`apps/api/src/modules/content/models/gallery.model.ts`), `MediaItem`, `ProgrammeGallery` | Candidate sources; the library is incomplete |
| Metrics, project impact | `Stat` (`packages/shared/src/schemas/stat.ts:6-13`), `ImpactMetricsGrid`, `formatStatValue` | Shape reusable; site-wide, not per project |
| Programme, category, SDGs | `PILLARS`, `SDG_GOALS` (`packages/shared/src/constants/content.ts:36-110`) | The only structured lists; seven SDGs only. Story, gallery and events use free text |
| Assignees, members | `/api/admin/users` (admin-only, bare array); `TeamMember` is public content | Gap |
| Notifications | None. `apps/admin/src/components/layout/NotificationsBell.tsx:88-104` and `NewSubmissionsBanner` poll new submissions; preferences in `localStorage` | No overlap; nothing to emit to |
| Audit, activity log | None. Scattered: `EventMessage.sentBy`, social `approvedBy`/`rejectedBy`, `PublicationAttempt`, `Invitation.createdBy` | No reusable mechanism |
| Privacy export, erase, retention | `apps/api/src/modules/privacy/privacy-request.service.ts:87-132` (submissions, subscribers, donations); timer-only `apps/api/src/modules/privacy/retention.service.ts:17-66` | Must be extended for applicant data. Already misses registrations and reviews. Cannot delete Cloudinary files |
| Scheduled reminders | `/api/automations/run` | Reuse point; a third branch changes the 200/207 rule |
| Sharing a story | `SocialPublishDialog` keyed on `articleId` | Reusable once the source is generalised |
| Dashboard cards | `DASHBOARD_CONTENT_COLLECTIONS` (`packages/shared/src/schemas/dashboard.ts:23-32`), `apps/api/src/modules/dashboard/dashboard.service.ts:44-104` | Extension point; `StatCard` and `Panel` are private |

## 11. Testing and quality gates

| Workspace | Runner | Tracked test files | CI run 36028885561 |
| --- | --- | --- | --- |
| `@iaa/shared` | vitest, node | 12 | 135 pass |
| `@iaa/api` | vitest, forks pool, 30 s / 60 s timeouts, `reflect-metadata` setup | 20 | 143 pass |
| `@iaa/admin` | vitest, jsdom, `apps/admin/src/test/setup.ts` | 28 | 81 pass; 4 files fail on `VITE_API_URL` |
| `@iaa/marketing` | vitest `--testTimeout=20000`, jsdom | 35 | 171 pass |

- **API harness.** `createTestContext()` (`apps/api/test/harness.ts:27-57`) starts
  `MongoMemoryServer`, builds the real container and swaps `TOKENS.EmailProvider` for a `vi.fn()`
  spy. `apps/api/test/app-assembly.test.ts` checks the DI graph without a database.
- **Login helper and 403 sweep.** `login(email, permissions)` creates a user and logs in over HTTP
  (`apps/api/test/integration/submission-actions.test.ts:18-34`); the sweep at `:192-208` expects
  403 for a user with no grant. Logins count against `sensitiveRateLimit`, so keep each file under
  20 sensitive POSTs. No integration test uses the editor role.
- **Unit pattern.** Construct the service with fakes; stub Mongoose statics with `vi.spyOn`
  (`apps/api/src/modules/reviews/review.service.test.ts:13-25`).
- **Lint** (`eslint.config.mjs:37-70`, `--max-warnings=0`): `complexity` 14, `max-depth` 4,
  `max-params` 4, `no-nested-ternary`, `no-explicit-any` (off in tests), `consistent-type-imports`,
  alphabetised `import/order` with blank lines between groups. `exhaustive-deps` and `no-console`
  are warnings, which fail. No `max-lines`. Lint passes locally over 524 files.
- **Prettier is not enforced.** `format:check` is not in CI and 124 files already fail it; a
  repo-wide `npm run format` would bury a feature diff. Locally the binary lacks its exec bit: run
  `node node_modules/prettier/bin/prettier.cjs`.
- **Other constraints.** Rebuild shared before API tests, typecheck or lint see a change. API,
  shared and marketing-function code is not type-checked. Admin tests that import `api-client`
  unmocked fail wherever `VITE_API_URL` is unset. Locally, run vitest with `--maxWorkers=2`.
- **Definition of done** (`docs/agent_plan.md` §8, `docs/admin-actions-review.md:58-68`):
  `build:shared`, lint, typecheck, test, build and `git diff --check`, stating what is unverified.

## 12. Known defects found during discovery

| Defect | Evidence | Effect |
| --- | --- | --- |
| Public CV signer unreachable | `apps/marketing/src/lib/cloudinary.ts:22-23` calls `/media/sign-cv`; router mounted only at `/api/admin/media` (`apps/api/src/app.ts:92`) | Every CV upload gets 404, since `eab98a8` |
| Raw `.parse()` returns 500 | `apps/api/src/modules/reviews/review.routes.ts:47,63,64,73,121,134,144,151`, `apps/api/src/modules/event-messages/event-message.routes.ts:35`, `apps/api/src/modules/analytics/analytics.routes.ts:62` | Bad input reported and logged as a server error |
| Retired AI model id | `'claude-3-5-sonnet-20241022'` at `apps/api/src/modules/ai/ai.service.ts:48` | AI assist calls fail |
| Unrouted review confirmation | `/reviews/confirm?token=` built at `apps/api/src/modules/reviews/review.service.ts:255`; marketing routes only `reviews` (`apps/marketing/src/app/App.tsx:74`) | Organisation-review confirmations land on NotFound |
| MFA requirement not enforced | `isMfaRequiredForRole` (`apps/api/src/modules/auth/auth.service.ts:237`) has no caller | `MFA_REQUIRED_FOR_ROLES` does nothing |
| Dead `roles` resource | `packages/shared/src/enums.ts:48`, used nowhere else | An unused matrix row |
| Privacy erase misses data | `apps/api/src/modules/privacy/privacy-request.service.ts:87-132` | Registrations and reviews survive erasure |
| Refresh in the sensitive bucket | `apps/api/src/modules/auth/auth.routes.ts:22`; tokens cleared on failed refresh (`apps/admin/src/lib/api-client.ts:268-270`) | Public traffic or repeated logins from one IP can sign staff out |
| Editor uploads not catalogued | 403 swallowed at `apps/admin/src/lib/media-library.ts:58-64` | Editor uploads never appear in the library |
| CI never green | 94 runs, 0 successes; `apps/admin/src/lib/api-client.ts:72-75` | No CI signal |
| Missing `@vitest/coverage-v8` | `.github/workflows/ci.yml:66-71` | SonarCloud has never run |
| Stale `.env.example` | 16 of 56 schema keys missing | Incomplete environment setup |
| Stale `packageManager` | `package.json:43` names pnpm; the lockfile is npm | Misleads tools and people |
| README drift | React 18 and MUI v6 (`README.md:23`); `npm ci` without `--include=dev` (`:74`) | Wrong stack for newcomers |

## 13. Root directory inventory

| Entry | Git status | Referenced by | Needed |
| --- | --- | --- | --- |
| `.env.example` | tracked | README step 3 | Yes; stale (§3) |
| `.github/` | tracked | GitHub | Yes; `automations.yml` sends event and review email |
| `.gitignore`, `.prettierignore`, `.prettierrc.json` | tracked | git, format scripts | Yes |
| `.raven/` | untracked, contents ignored (`.gitignore:45-48`) | nothing; plugin session cache | No. Empty copies under `apps/*` and `packages/shared` |
| `AGENTS.md` | tracked | README, `docs/agent_plan.md` | Yes; stepwise-form rule |
| `IMG_0203.JPG`, `TOM-CHRIS - PEOPLE WHO INSPIRE.JPG` | untracked, ignored | nothing here; `tools/upload-site-imagery.mjs` reads `~/Downloads` copies | No; byte-identical to those copies |
| `credentials.txt` | untracked, ignored (`.gitignore:19`), never committed | nothing | Not by the build. Contents not read; may be the only copy of some secrets |
| `Impact_Africa_Alliance_AI_Implementation_Specification.docx` | untracked, **not ignored**; moved to `docs/` on 27 September | nothing | Input spec for this work; `git add -A` would commit it |
| `Social_Publishing_Service_Agent_Build_Spec.docx` | untracked, **not ignored** | `docs/social-publishing.md:199-205` | No; already implemented |
| `README.md` | tracked | | Yes; drifted (§12) |
| `apps/`, `packages/`, `docs/`, `tools/` | tracked | everything | Yes. `tools/` has 27 files, mostly dated one-off scripts |
| `eslint.config.mjs`, `tsconfig.base.json` | tracked | lint, all tsconfigs | Yes |
| `node_modules/` | ignored | npm | Local only |
| `output/` | untracked, ignored | `tools/publish-showcase-imagery.mjs:44-45` | No; one regenerable backup |
| `package.json`, `package-lock.json` | tracked | `npm ci` in CI, Render, Vercel | Yes; `packageManager` is stale |
| `render.yaml` | tracked | Render Blueprint | Yes |
| `sonar-project.properties` | tracked | SonarCloud job (`ci.yml:44-77`) | Not for build or deploy; the job has never run |

`vite.live.config.ts` exists only in `apps/admin` and `apps/marketing`, gitignored (`.gitignore:51`)
and untracked, so it is not a root item.

## 14. Decisions this discovery forces

These are open. [`IAA_EXPANSION_PLAN.md`](IAA_EXPANSION_PLAN.md) records the answers.

### Naming and collisions

- **D1.** Impact Stories: extend `stories` or add a key such as `impact-stories`. Also the label of
  the existing testimonial resource, the Home testimonial band, and a model name other than `Story`.
- **D2.** Form submissions: a name, path and key other than `submissions`. Whether the fixed
  volunteer and partner forms ever move to the builder.
- **D3.** Application reviews: a name other than `reviews` for the path, route and nav label.
- **D4.** Admin route prefixes that equal resource keys, or new `mayRead` mappings.
- **D5.** Lowercase kebab-case status values per module. Whether `ContentStatus` stays
  `draft|published`.

### Authorisation

- **D6.** How `publish`, `assign`, `review` and `archive` map onto four actions: `update`, extra
  resource keys, `requireRole(Admin)`, or a new action with a column for every resource.
- **D7.** Whether editors read new resources automatically, applicant data especially
  (`enums.ts:63`), and which keys join `writeResources`.
- **D8.** Who "all staff" are: admins and editors, or a third role that touches every `requireRole`.
- **D9.** What `tasks:read` means (all or mine), and how project membership limits visibility.
- **D10.** A user-directory endpoint for pickers.
- **D11.** Rollout: per-environment backfill, the 15-minute lag and pending invitations.

### Data

- **D12.** Soft delete or archive (`archivedAt`, status, or both), and which deletes stay hard.
- **D13.** An audit collection and what writes to it.
- **D14.** Production index creation (dated script or `createIndexes` at boot), and whether the
  current indexes exist in production.
- **D15.** Concurrency under last-write-wins: board ordering, and preconditions on form and story
  edits.
- **D16.** Task keys without transactions, for example a counter collection with `$inc`.
- **D17.** Embed or reference: milestones, checklists, comments, activity, form steps, story blocks.
  The form versioning scheme.
- **D18.** How each new service clears optional fields: `$unset` or stored `null`.

### Public surfaces

- **D19.** Draft resume token design, expiry, revocation and transport (body or header, since CORS
  has no credentials and the marketing client sends no custom headers).
- **D20.** Dedicated limiters for autosave, drafts and upload signing. Whether `/auth/refresh`
  leaves the shared bucket.
- **D21.** Server-side validation of answers against the stored form definition.
- **D22.** Public uploads: per-draft signing, folder and `public_id` binding, verification on
  submit, public or authenticated delivery, deletion. Whether the CV signer is fixed in this work.
- **D23.** Formats and sizes beyond images and PDF up to 5 MB, for documents and story video.
- **D24.** The immersive route inside or outside `Layout`; an unsaved-changes guard without
  `useBlocker`.
- **D25.** Story preview: an authenticated preview API with a `noindex` route, or renderers
  duplicated in the admin.
- **D26.** Story SEO: a meta function and rewrite, JSON-LD, sitemap entries, and deploy order.

### Admin UI

- **D27.** A drag-and-drop dependency, or up/down buttons only.
- **D28.** Server-side paging, filtering and search for tasks and submissions.
- **D29.** Lazy-loading new routes, with a route-level error boundary.
- **D30.** The notification boundary: an event interface only, email, or an in-app collection.

### Operations

- **D31.** Privacy coverage for drafts, submissions and files; draft expiry; the existing
  registration and review gap.
- **D32.** Reminders and form windows as automation branches, and how the 200/207 rule counts them.
- **D33.** Making CI pass before relying on it (`VITE_API_URL`; the coverage package or no Sonar).
- **D34.** The time zone behind "due today" and "overdue".
- **D35.** Fixes to take on the way: AI model id, raw `.parse()` sites, `packageManager`, env and
  README drift, and root cleanup, including `credentials.txt`.

### Unknowns behind these decisions

These need production access or a person: production indexes; how many staff share an office IP and
whether 429 logouts already happen; whether Vercel honours `packageManager`; Cloudinary's signature
window, authenticated delivery and size limits; whether any CV upload ever succeeded; staff time
zones; whether the Resend domain can send to any applicant address.
