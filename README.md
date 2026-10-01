# Impact Africa Alliance — Web Platform

Monorepo for the Impact Africa Alliance (IAA) digital presence: a public marketing website, a
content-management admin console, and the API that powers both.

See [`docs/agent_plan.md`](docs/agent_plan.md) for the full architecture and [`docs/`](docs/) for the
converted brand/content specifications.

Interface contributors should follow the [form rules](AGENTS.md) and
[admin form design guidance](docs/design/forms.md): forms over five fields use dedicated stepwise pages.

## Workspaces

| Package | Description | Deploys to |
| --- | --- | --- |
| [`packages/shared`](packages/shared) | Zod schemas, DTO types, enums, brand tokens — the contract shared by every app | — |
| [`apps/api`](apps/api) | Express + Mongoose API with tsyringe dependency injection | Render (free web service) |
| [`apps/marketing`](apps/marketing) | Public website (Vite + React + MUI) | Vercel |
| [`apps/admin`](apps/admin) | Admin console / CMS (Vite + React + MUI) | Vercel (separate project) |

## Tech stack

TypeScript 6 everywhere · React 19 + Vite 8 (no Next.js) · MUI v9 + MUI X Date Pickers v9 ·
React Router 7 · TanStack Query v5 · Zod 4 · Express 5 + MongoDB (Mongoose 9) · tsyringe DI ·
JWT auth (Admin/Editor roles) · Resend (email) · Cloudinary (media) · Stripe + Paystack (donations) ·
dnd-kit (admin task board and builders) · MUI Skeletons (no spinners) ·
Vitest 4 + Testing Library + supertest · ESLint + Prettier + SonarQube · GitHub Actions CI.

## Work, applications and impact stories

The admin platform expansion adds four modules. Each has its own permission key, and the design
record is [`docs/IAA_EXPANSION_PLAN.md`](docs/IAA_EXPANSION_PLAN.md).

| Module | Admin console | Public site |
| --- | --- | --- |
| **Projects** (`projects`) | Work → Projects: list, stepwise editor, and a project page with Overview, Tasks, Milestones & activities, Media & evidence, Impact, Documents and Activity tabs | — |
| **Tasks** (`tasks`) | Work → Tasks: My tasks, All tasks, a drag-and-drop board, a task drawer and page (checklist, attachments, comments with @mentions), and quick create in the top bar | — |
| **Forms and applications** (`forms`, `applications`) | Applications → Forms (builder with steps, conditional questions, preview, publish/close), Applications (status tabs, reviews, history, CSV export) and Review queue | `/apply/:slug`: one step at a time, autosave, "email me a link to finish later", file uploads |
| **Impact stories** (`impact-stories`) | Content → Impact stories: block editor, "Create impact story" from a project, preview, Admin-only publishing | `/impact/stories` and `/impact/stories/:slug` (also in the sitemap and crawler link previews) |

The dashboard gains a "Your work" panel. Editors get read, create and update on projects, tasks,
forms and impact stories, but not `applications:read`: applicant data is granted per person under
Users → Permissions. Only an Admin publishes a form or a story. The CMS resource `stories` is the
existing testimonials list, relabelled "Testimonials" in the admin.

## Getting started

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Build the shared package (apps import its compiled output)
npm run build:shared

# 3. Configure environment — copy the relevant blocks from .env.example
cp .env.example apps/api/.env
#   set apps/marketing/.env and apps/admin/.env with VITE_API_URL

# 4. Seed the first admin user (reads SEED_ADMIN_* from apps/api/.env)
npm run seed

# 5. Recover an existing admin without SEED_ADMIN_PASSWORD (optional)
cd apps/api
DOTENV_CONFIG_PATH=.env.production npm run admin:reset -- admin@impactafricaalliance.org
cd ../..

# 6. Run the three apps (separate terminals)
npm run dev:api          # http://localhost:4000
npm run dev:marketing    # http://localhost:5173
npm run dev:admin        # http://localhost:5174
```

> A local MongoDB (or a free MongoDB Atlas M0 cluster) is required for the API. The marketing
> site renders fully with static fallback content even before the CMS is populated.

## Quality gates

```bash
npm run lint        # ESLint (complexity + import hygiene, SonarQube-aligned)
npm run typecheck   # strict TypeScript across all workspaces
npm test            # Vitest unit + integration (API uses mongodb-memory-server)
npm run build       # production build of every workspace
```

SonarCloud analysis runs in CI on `main` (configure `SONAR_TOKEN`); see
[`sonar-project.properties`](sonar-project.properties).

## Deployment

### API → Render
The [`render.yaml`](render.yaml) Blueprint provisions a free Node web service:
`npm ci && npm run build:shared && npm run build -w @iaa/api`, started with
`node apps/api/dist/server.js`, health-checked at `/api/health`. Set the secret env vars
(`MONGODB_URI`, `CORS_ORIGINS`, `RESEND_API_KEY`, `CLOUDINARY_*`, `STRIPE_*`, `PAYSTACK_*`,
`SEED_ADMIN_*`) in the Render dashboard, then run the seed once from a Render shell:
`npm run seed`.

For account recovery, `npm run admin:reset -w @iaa/api -- <admin-email>` prompts for a new
password, stores only its bcrypt hash, restores Admin permissions, revokes existing sessions, and
clears stale MFA state. It does not read `SEED_ADMIN_PASSWORD`.

> Render's free tier sleeps after inactivity; the first request after idle incurs a cold start.

### Marketing & Admin → Vercel
Create **two** Vercel projects from this repo:

| Project | Root Directory | Env |
| --- | --- | --- |
| iaa-marketing | `apps/marketing` | `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GA4_MEASUREMENT_ID` (no Paystack key: donors use Paystack's hosted checkout) |
| iaa-admin | `apps/admin` | `VITE_API_URL`, `VITE_SITE_URL` (public site origin for links shown in the admin, such as a form's share link; defaults to the production site) |

Each app's [`vercel.json`](apps/marketing/vercel.json) builds the shared package first and rewrites
all routes to `index.html` (SPA). Add both Vercel domains to the API's `CORS_ORIGINS`.

### Rolling out the admin platform expansion

No new environment variables are needed: links use `PUBLIC_SITE_URL` and `ADMIN_URL`, previews
are signed with the JWT access secret, applicant emails use the Resend settings, and the admin's
share links use its existing `VITE_SITE_URL`. Production runs with `autoIndex` off, so indexes and
permissions are applied by hand, once per environment:

1. **Deploy the API before the marketing site.** The marketing prebuild writes the sitemap from
   `/api/impact-stories`, and `api/story-meta.ts` builds story link previews from the same API; an
   API without those routes keeps the old sitemap and plain previews.
2. **Build the indexes** from the repo root. The script runs in `apps/api`, so `--env` is relative
   to it (default `.env`):

   ```bash
   npm run indexes:sync -w @iaa/api -- --env .env.production             # dry run: lists what is missing
   npm run indexes:sync -w @iaa/api -- --env .env.production --confirm   # creates them; never drops one
   ```

3. **Backfill permissions** so existing accounts receive the five new keys their role template
   entitles them to (it only ever adds):

   ```bash
   npm run build:shared
   node tools/sync-user-permissions.mjs --env apps/api/.env.production             # dry run
   node tools/sync-user-permissions.mjs --env apps/api/.env.production --confirm
   ```

4. **Ask staff to sign out and in** (or wait 15 minutes) so their access tokens carry the new
   permissions. Until then the new sidebar items stay hidden or render empty.
5. Deploy the marketing site and the admin console. The hourly GitHub Actions call to
   `POST /api/automations/run` also clears expired applicant drafts and their uploaded files.

Collections and indexes the sync creates (from the model files):

| Collection | Indexes |
| --- | --- |
| `projects` | `{slug}` unique · `{status, updatedAt:-1}` · `{leadId}` · `{memberIds}` · `{archivedAt}` |
| `tasks` | `{key}` unique · `{number}` unique · `{status, boardOrder, _id}` · `{updatedAt:-1, _id:-1}` · `{assigneeIds, status}` · `{projectId, status}` · `{dueDate}` · `{parentTaskId}` · `{archivedAt}` |
| `taskcomments` | `{taskId, createdAt}` |
| `forms` | `{slug}` unique · `{status, updatedAt:-1}` |
| `formversions` | `{formId, version}` unique |
| `formsubmissions` | `{reference}` unique, partial (string references only) · `{formId, status, submittedAt:-1, _id:-1}` · `{status, submittedAt:-1, _id:-1}` · `{applicant.email}` · `{tokenHashes}` · `{draftExpiresAt}` TTL 7 days after expiry, partial on `status: 'draft'` |
| `impactstories` | `{slug}` unique · `{status, publishedAt:-1}` · `{projectId}` |
| `auditevents` | `{entityType, entityId, at:-1}` · `{module, at:-1}` |
| `counters` | `_id` only (the counter's name) |

The sync reports, and never replaces, an index whose keys exist with other options. If an
environment ever synced an earlier build of this branch, drop the superseded
`{status, boardOrder}` (tasks) and the two `formsubmissions` list indexes without `_id`, and change
the draft TTL with `collMod` (`expireAfterSeconds: 604800`). Applicant files use Cloudinary
authenticated delivery; check one upload and download against a non-production cloud first.

## Payment webhooks

After deploying, register webhooks pointing at the API:
- **Stripe** → `POST /api/payments/webhooks/stripe` (set `STRIPE_WEBHOOK_SECRET`).
- **Paystack** → `POST /api/payments/webhooks/paystack`. Paystack signs with the secret key, so
  `PAYSTACK_SECRET_KEY` is all it needs.

Paystack charges in Ghana cedis (`PAYSTACK_CURRENCY`, default `GHS`) and Stripe in US dollars;
each donation keeps its own currency and the admin never adds the two together. The owner's
step-by-step checklist is [`docs/deploy/donations.md`](docs/deploy/donations.md).

## Brand assets

Logo variants and favicons are generated from the source brand identity into each app's
`public/brand`. See [`docs/brand-assets.md`](docs/brand-assets.md) to regenerate.
