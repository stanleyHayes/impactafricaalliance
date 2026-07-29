# Impact Africa Alliance — Web Platform

Monorepo for the Impact Africa Alliance (IAA) digital presence: a public marketing website, a
content-management admin console, and the API that powers both.

See [`docs/agent_plan.md`](docs/agent_plan.md) for the full architecture and [`docs/`](docs/) for the
converted brand/content specifications.

## Workspaces

| Package | Description | Deploys to |
| --- | --- | --- |
| [`packages/shared`](packages/shared) | Zod schemas, DTO types, enums, brand tokens — the contract shared by every app | — |
| [`apps/api`](apps/api) | Express + Mongoose API with tsyringe dependency injection | Render (free web service) |
| [`apps/marketing`](apps/marketing) | Public website (Vite + React + MUI) | Vercel |
| [`apps/admin`](apps/admin) | Admin console / CMS (Vite + React + MUI) | Vercel (separate project) |

## Tech stack

TypeScript everywhere · React 18 + Vite (no Next.js) · MUI v6 · MongoDB (Mongoose) ·
tsyringe DI · JWT auth (Admin/Editor roles) · Resend (email) · Cloudinary (media) ·
Stripe + Paystack (donations) · TanStack Query · MUI Skeletons (no spinners) ·
Vitest + Testing Library + supertest · ESLint + Prettier + SonarQube · GitHub Actions CI.

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
| iaa-marketing | `apps/marketing` | `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_PAYSTACK_PUBLIC_KEY`, `VITE_GA4_MEASUREMENT_ID` |
| iaa-admin | `apps/admin` | `VITE_API_URL` |

Each app's [`vercel.json`](apps/marketing/vercel.json) builds the shared package first and rewrites
all routes to `index.html` (SPA). Add both Vercel domains to the API's `CORS_ORIGINS`.

## Payment webhooks

After deploying, register webhooks pointing at the API:
- **Stripe** → `POST /api/payments/webhooks/stripe` (set `STRIPE_WEBHOOK_SECRET`).
- **Paystack** → `POST /api/payments/webhooks/paystack`.

## Brand assets

Logo variants and favicons are generated from the source brand identity into each app's
`public/brand`. See [`docs/brand-assets.md`](docs/brand-assets.md) to regenerate.
