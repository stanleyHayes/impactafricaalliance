# Impact Africa Alliance — Engineering Plan (`agent_plan.md`)

> Source of truth: [`docs/website-specification.md`](docs/website-specification.md) and
> [`docs/website-content.md`](docs/website-content.md) (converted from the original `.docx` briefs).
> This document is the engineering counterpart: architecture, conventions, and a phased delivery plan.

---

## 1. Product summary

Impact Africa Alliance (IAA) is a Pan-African non-profit. The product is a **bold, fast,
accessible public marketing website** backed by a **lightweight CMS / admin console** so the
non-technical team can manage news, stories, team, partners, reports, jobs and impact figures,
read inbound form submissions, and accept donations.

Two distinct front-ends, one API:

| Surface | Audience | Hosting |
| --- | --- | --- |
| **Marketing site** | Public — youth, donors, partners, governments | Vercel |
| **Admin console** | IAA staff (Admin / Editor roles) | Vercel (separate project) |
| **API** | Both front-ends | Render (free web service, Blueprint) |
| **Database** | — | MongoDB Atlas (free M0 cluster) |

### Locked decisions (confirmed with stakeholder)
- **Payments:** Paystack (African cards/mobile money) **+** Stripe (international) — live integration with webhooks; test keys in non-prod.
- **CMS scope:** Editorial (Blog/News, Impact Stories), Organization (Team, Partners, Reports), Jobs & Impact stats, and a Form-submissions inbox (Contact / Partner / Volunteer / Newsletter).
- **Repo:** Monorepo with npm workspaces.
- **Auth:** JWT + bcrypt, role-based (Admin, Editor), first admin via seed script.

---

## 2. Technology stack

| Concern | Choice | Rationale |
| --- | --- | --- |
| Language | TypeScript (strict) everywhere | Type safety end-to-end; shared DTOs |
| Front-end | **Vite + React 18** (not Next.js) | SPA per stakeholder; fast DX; trivial Vercel deploy |
| UI kit | **MUI v6** (`@mui/material`, Emotion) | Accessible components, theming, design tokens |
| Loading UX | **MUI `Skeleton`** (never `CircularProgress`) | Perceived performance; matches brief |
| Data fetching | **TanStack Query** | Caching, retries, skeleton-friendly states |
| Forms | **react-hook-form + zod** | Validation shared with the API |
| Animation | **framer-motion** + `react-intersection-observer` | Scroll reveals, animated counters |
| API | **Express 4 + TypeScript** | Small, well-understood, Render-friendly |
| DI | **tsyringe** (constructor injection + container) | Testable, decoupled; no service locator in business code |
| ODM | **Mongoose 8** | MongoDB modelling + validation |
| Auth | **jsonwebtoken + bcryptjs** | Stateless JWT, hashed passwords |
| Email | **Resend** (`resend` SDK) | Transactional + notification emails |
| Media | **Cloudinary** (`cloudinary` SDK) | Image storage, transforms, WebP |
| Payments | **Stripe SDK** + **Paystack REST** | Global + African coverage |
| Validation | **zod** (shared package) | One schema, reused on client + server |
| Logging | **pino** | Structured logs |
| Testing | **Vitest** + **Testing Library** + **supertest** + **mongodb-memory-server** | Unit + integration, no external services in CI |
| Quality | **ESLint (typescript-eslint) + Prettier + SonarQube** | Lint gate + static analysis |
| CI/CD | **GitHub Actions** → Vercel (FE) + Render Blueprint (API) | Automated lint/typecheck/test/build |

---

## 3. Repository layout

```
impactafricaalliance/
├── apps/
│   ├── marketing/            # Public website (Vite React SPA)  → Vercel
│   ├── admin/                # Admin console (Vite React SPA)   → Vercel
│   └── api/                  # Express + Mongoose API           → Render
├── packages/
│   └── shared/               # Cross-cutting TS: zod schemas, DTO types, enums, brand tokens
├── docs/                     # Markdown specs (converted from .docx)
├── .github/workflows/ci.yml  # Lint + typecheck + test + build matrix
├── render.yaml               # Render Blueprint (api service + env)
├── docs/agent_plan.md        # This file
├── package.json              # npm workspaces root + orchestration scripts
├── tsconfig.base.json        # Shared compiler options
├── .eslintrc.cjs / .prettierrc / sonar-project.properties
└── .env.example              # Documented env contract for every workspace
```

### Dependency rule (enforced by review + lint boundaries)
`apps/*` may depend on `packages/shared`. `packages/shared` depends on **nothing app-specific**.
`apps/api` never imports from `apps/marketing` or `apps/admin` and vice-versa. The only contract
between front-end and back-end is the HTTP API plus the types/schemas in `packages/shared`.

---

## 4. API architecture (Clean-ish, DI-driven)

Layered, with **constructor injection via tsyringe**. No layer reaches "down" past its neighbour;
data flows controller → service → repository → model.

```
HTTP request
  └─ Router (Express)            route table, no logic
       └─ Controller             validates input (zod), maps to/from DTOs, sets status codes
            └─ Service           business rules, orchestration, transactions  ← unit-tested core
                 └─ Repository   Mongoose data access behind an interface     ← swappable/mockable
                      └─ Model   Mongoose schema
```

Cross-cutting:
- **Config** — a single validated, typed config object (zod-parsed `process.env`); fail fast on boot.
- **Error handling** — `AppError` hierarchy + one central error middleware → consistent JSON shape `{ error: { code, message, details? } }`. No leaking stack traces in prod.
- **Auth middleware** — verifies JWT, attaches `req.user`, `requireRole('admin')` guard.
- **Security** — `helmet`, strict CORS allow-list (marketing + admin origins), `express-rate-limit` on auth/forms/payments, body-size limits, mongo-sanitize.
- **Validation** — every public route parses with a shared zod schema before touching a service.
- **Providers** — `EmailProvider` (Resend), `MediaProvider` (Cloudinary), `PaymentProvider` (Stripe/Paystack) are **interfaces** registered in the DI container; business code depends on the interface, so they are mocked in tests.

### Module map (`apps/api/src/modules/*`)
Each module owns `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.model.ts`, `*.schema.ts`, and tests.

- `auth` — login, refresh, me, password change; bcrypt + JWT; roles.
- `users` — admin user management (Admin only).
- `articles` — Blog/News (slug, body, cover image, tags, status draft/published, publishedAt).
- `stories` — Impact Stories (name, country, program, quote, narrative, photo).
- `team` — Team members (name, role, tier, bio, photo, LinkedIn, order).
- `partners` — Partner logos (name, logo, url, order).
- `reports` — Downloadable reports (title, year, PDF asset, status).
- `jobs` — Careers/internships (title, location, type, description, deadline, status).
- `stats` — Impact counters (key, label, value, suffix, order) — drives the animated numbers.
- `submissions` — Contact / Partner / Volunteer form captures + Newsletter subscribers; triggers Resend notifications.
- `media` — Cloudinary signed-upload endpoint (Admin only).
- `payments` — Donation intents (Stripe / Paystack) + webhook handlers + donation records.
- `health` — liveness/readiness for Render.

---

## 5. Front-end architecture

### Shared conventions (both apps)
- `src/app` (providers, router), `src/components` (reusable UI), `src/features/<domain>` (data hooks + views), `src/lib` (api client, query client), `src/theme` (MUI theme from brand tokens).
- **API client**: a thin typed `fetch` wrapper; one `useXQuery`/`useXMutation` per resource via TanStack Query. Loading → **`Skeleton`** placeholders sized to final content (no layout shift, no spinners).
- **Error boundaries** + a friendly branded error/empty state.
- **Accessibility**: semantic landmarks, focus management on route change, labelled controls, ≥4.5:1 contrast (brand palette already compliant for body text), keyboard-navigable nav/menus, `prefers-reduced-motion` respected by all framer-motion animations.

### Marketing site pages (content from `docs/website-content.md`)
`/` Home · `/about` · `/our-work` + 4 initiative routes · `/impact` · `/get-involved` (Partner/Volunteer/Donate/Careers tabs) · `/contact` · `/news` + `/news/:slug` · `404`.
Global: sticky header w/ mobile overlay nav, footer (4-col), newsletter CTA banner, social links, cookie consent, SEO `<meta>`/OpenGraph/JSON-LD Organization per route, GA4 hook.

Signature interactions: hero fade-in (with `Africa` gold pulse), scroll-reveal sections, **Intersection-Observer animated counters**, partner logo marquee, card hover lift.

### Admin console
Login → protected shell (sidebar nav, role-aware). Resource list/detail/editor screens for articles, stories, team, partners, reports, jobs, stats; a **Submissions inbox** (filter by type, mark read, export); user management (Admin only); Cloudinary image picker; donation log (read-only). Skeleton tables/forms while loading.

---

## 6. Data model (MongoDB collections)

`users` · `articles` · `stories` · `teamMembers` · `partners` · `reports` · `jobs` · `impactStats` ·
`submissions` (discriminated by `type`) · `subscribers` · `donations`.
All documents carry `createdAt`/`updatedAt`. Content collections carry `status` (`draft`|`published`)
and (where ordered) an `order` field. Slugs are unique and indexed.

---

## 7. Security & compliance

- Secrets only via env (never committed); `.env.example` documents the contract.
- JWT access tokens short-lived; passwords bcrypt-hashed (cost ≥ 12).
- CORS allow-list; Helmet headers; HTTPS enforced (Vercel + Render terminate TLS).
- Rate-limit auth, public forms, and payment endpoints; reCAPTCHA-ready hook on public forms.
- Stripe/Paystack **webhook signature verification**; donation amounts validated server-side.
- Input validation on every endpoint; Mongo query sanitisation; no string-concatenated queries.
- GDPR: cookie consent gate before analytics; newsletter double-opt-in friendly; data-subject delete path in admin.

---

## 8. Quality gates (must pass for "done")

1. `npm run typecheck` — clean (strict TS, no `any` escapes).
2. `npm run lint` — ESLint clean (typescript-eslint, complexity/cognitive-complexity caps).
3. `npm run test` — Vitest green; meaningful coverage on services/controllers/hooks.
4. `npm run build` — all workspaces build.
5. **SonarQube**: no new bugs/vulnerabilities/code-smells above threshold, ≤3% duplication, security-hotspots reviewed. Enabled via `sonar-project.properties` + CI step.

SonarQube-aware practices baked in: small single-responsibility functions (low cognitive complexity), no duplicated literals (shared constants), no nested ternaries, exhaustive switch handling, no unused code, no hardcoded secrets, prefer immutability, handle every promise.

---

## 9. CI/CD & deployment

- **GitHub Actions** (`ci.yml`): install (cached) → typecheck → lint → test → build, across workspaces; optional SonarCloud scan on push to `main`.
- **API → Render** via `render.yaml` Blueprint: Node web service, free plan, build `npm ci && npm run build -w @iaa/api`, start `node apps/api/dist/server.js`, health check `/api/health`, env vars declared (synced from dashboard/secret manager).
- **Marketing & Admin → Vercel**: two projects, root dirs `apps/marketing` / `apps/admin`, build via Vite, SPA rewrite to `index.html`, env `VITE_API_URL` per project.
- MongoDB Atlas M0 free cluster; Render free service note (cold starts) documented in README.

---

## 10. Phased delivery

| Phase | Deliverable | State |
| --- | --- | --- |
| 0 | Docs → markdown; this plan | ✅ |
| 1 | Monorepo tooling (workspaces, tsconfig, eslint, prettier, gitignore) | ▶ |
| 2 | `packages/shared` — zod schemas, DTO types, enums, brand/theme tokens | |
| 3 | API foundation — Express, DI container, config, Mongo, errors, security, health + tests | |
| 4 | API auth (JWT/roles) + seed script | |
| 5 | API content modules (articles, stories, team, partners, reports, jobs, stats) + tests | |
| 6 | API forms + Resend email; media (Cloudinary); payments (Stripe/Paystack) + webhooks | |
| 7 | Marketing site — theme, layout, all pages, skeletons, animations, SEO | |
| 8 | Admin console — auth, shell, CRUD screens, submissions inbox, media picker | |
| 9 | Test hardening + SonarQube config + coverage | |
| 10 | CI/CD, `render.yaml`, Vercel config, README, `.env.example` | |

---

## 11. Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:` …).
- **Naming**: `camelCase` vars/functions, `PascalCase` types/components, `kebab-case` files (except React components `PascalCase.tsx`).
- **No magic values**: colours, breakpoints, role names, route paths live in `packages/shared` or a `constants` module.
- **Errors are values at the boundary**: services throw typed `AppError`; controllers translate to HTTP.
- **Every async path handles failure**; no floating promises.
- **Tests live beside code** (`*.test.ts`) and mock providers via DI.

---

## 12. Dependency versions

The project tracks the **latest** release of every dependency (React 19, TypeScript 6,
Vite 8 / Rolldown, Vitest 4, Mongoose 9, Express 5, zod 4, Resend 6, Stripe 22, etc.). Two
deliberate exceptions are pinned to the latest version that is *compatible with this
architecture* rather than the newest tag:

- **MUI → v7 (`@mui/material@^7`), not v9.** MUI v9 replaces the runtime Emotion engine with
  build-time **Pigment CSS** (`PigmentStack`, a Vite plugin and a different system-prop API).
  This codebase styles entirely through Emotion's runtime `sx`, so adopting v9 would be a CSS-engine
  migration, not a version bump. v7 is the latest major that keeps the Emotion runtime and is fully
  React-19 compatible. `@mui/x-data-grid` is pinned to v8 (latest grid compatible with Material v7).
- **ESLint → v9 (`eslint@^9`), not v10.** As of this build, `typescript-eslint`,
  `eslint-plugin-react`, and `eslint-plugin-import` all peer-require ESLint ≤9; none support v10 yet,
  so v10 produces an unresolvable dependency graph and a broken linter. v9.39 is the latest ESLint the
  plugin ecosystem supports. The config is the modern flat config (`eslint.config.mjs`).

Upgrade-driven code adaptations worth noting: Express 5 makes `req.query`/`req.params` read-only
(custom body sanitiser in `middleware/sanitize.ts`; `pathParam` helper for `string | string[]`
params); Mongoose 9 removed the public `FilterQuery` export (replaced by `common/mongo-types.ts`);
React 19 dropped the global `JSX` namespace (restored per-app via `react-jsx.d.ts`) and `useRef`
now requires an initial argument.
