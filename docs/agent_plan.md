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

---

## 13. Stakeholder website review updates (29 July 2026)

Source: `Impact Africa Alliance Website Updates.pdf`

- ✅ Homepage hero now tells a five-image impact story with timed crossfades, manual controls, and
  reduced-motion support. It uses the existing optimized image catalogue and remains compatible
  with the CMS-managed primary hero image.
- ⏳ Newly requested photography was not included with the review PDF. The animated story is ready
  for direct asset replacement when the approved files are supplied.
- ✅ Corrected the co-founder attribution to “Emmanuel Mbansi, Co-Founder, Impact Africa Alliance.”
- ✅ Revised prominent marketing copy to replace unnecessary dash-heavy sentence construction.
- ✅ Replaced stale social destinations with the supplied Facebook, Instagram, LinkedIn, X, and
  TikTok links; removed unconfirmed YouTube and WhatsApp destinations.
- ✅ Reworked the Impact page’s “By the Numbers” band to the recommended soft green `#E8F5EE`.
- ✅ Kept the primary description at 159 characters and aligned canonical, Open Graph, Twitter Card,
  and Organization schema URLs to `https://www.impactafricaalliance.org`.
- ✅ Removed public phone and headquarters placeholders until verified information is supplied.
- ✅ Verified marketing tests, typecheck, lint, and production build.

---

## 14. Static-page CMS expansion (29 July 2026)

- ✅ Expanded Page Settings from an image-only resource into a reusable page-content editor for
  Home, About, Our Work, Impact, Get Involved, Contact, News, Resources, Events, Privacy Policy,
  Cookie Policy, and Terms of Use.
- ✅ Added editable SEO title/description, hero eyebrow/title/subtitle/image, introduction
  eyebrow/title/Markdown body, and call-to-action title/body/button/URL fields.
- ✅ Kept short structural content as constrained inputs and routed long-form content through the
  existing Markdown editor with formatting toolbar, AI assist, and Write/Preview modes.
- ✅ Added a full Page Settings preview showing the composed hero, Markdown body, and CTA before
  publishing.
- ✅ Wired published page settings into the marketing routes with stable in-code fallbacks so a
  missing or draft CMS record cannot blank a public page.
- ✅ Legal pages accept a complete CMS-authored Markdown document and fall back to the reviewed
  compiled policy when no published document exists.
- ✅ Added optional reusable CMS CTA bands to the primary static marketing pages.
- ✅ Added idempotent published page-setting seed records for the expanded routes.

## 15. Marketing section and motion redesign (4 September 2026)

- Completed homepage impact cards: featured mint metric, compact supporting metrics,
  responsive stacking, matched skeletons, and preserved CMS values/counter behaviour.
- Rebuilt the shared “On the ground” / Get Involved photo showcase as a lead-image
  mosaic with readable captions and bounded image parallax.
- Redesigned About proof points as a connected statistics strip, values as an editorial
  list beside the introduction, and team tiers as compact profile groups. Missing photos
  use small branded initials; biographies, social links, and profile dialogs remain available.
- Added two lightweight CSS 3D sculpture variants with pointer rotation, keyboard/touch
  sliders, pause/play controls, offscreen animation suspension, and reduced-motion support.
- Added the alliance-network SVG and repaired theme-coloured SVG watermarks using masks;
  section/hero geometry is now visible in both themes without covering text or controls.
- Verification: marketing typecheck, production Vite build, changed-file ESLint, and both
  homepage impact tests passed (single-threaded retry after machine-load timeouts). Browser verified the
  homepage statistics in both themes, the photo mosaic, sculpture pause/keyboard controls,
  and a 390px gallery with no horizontal overflow.
- Verification limitation: browser disconnected during the About/mobile walkthrough;
  the final About-page visual and profile-dialog checks remain unverified.

### Team profile refinement (5 September 2026)

- Four equal team cards per desktop row, two on tablet, and one on mobile.
- Generated mint, forest-green glass, and brass artwork fills each card, with first name
  and role overlaid on a dark lower gradient. Real photos remain in profile dialogs.
- Biography appears only after selecting “Read full bio”. The link fades/slides into place
  on hover or keyboard focus, stays visible on touch devices, and respects reduced motion.
- Full names remain available to screen readers and in profile dialogs.
- Artwork and generation prompt are recorded in `docs/design/team-artwork.md`.
- Verification: About/content lint, marketing typecheck, and diff whitespace checks passed.
  Browser remained unavailable for the final card hover/touch walkthrough.

## 16. Grouped navigation and Events discovery (5 September 2026)

- Replaced seven primary links with five: Home, About, Our Work, News & Events,
  and Get Involved. The partnership button remains a separate action.
- Our Work groups programmes and Impact; News & Events groups Events first, News & Stories,
  and Resources; Get Involved groups participation and Contact.
- Added icon/title/description dropdown entries and a theme-coloured network SVG watermark.
- Desktop menus support click, ArrowDown, keyboard navigation, Escape, and focus restoration.
  Mobile uses the same destinations in expandable groups with the existing accessible close control.
- Parent navigation highlights nested routes, including individual event pages.
- Verification: changed-file lint, marketing typecheck, production build, and diff checks passed.
  Browser verified desktop dropdown appearance and Events routing, plus mobile expansion,
  light/dark themes, and close-on-selection at 390px. Viewport and original theme were restored.
- Automated checks: four Header tests passed, including keyboard focus/Escape and parent-route
  highlighting. The mobile navigation test exceeded its timeout under machine load; its isolated
  retry could not start a worker. The same mobile interaction passed in the live browser.

## 17. Events discovery and profile detail redesign (5 September 2026)

- Events now has an artwork-led card layout, text search across title/description/location/host,
  type and date filters, result counts, clear/reset actions, and retry/empty states.
- All published event pages are collected before client filtering, including events beyond 100.
- The calendar opens on a relevant month, shows event titles and times on desktop, compact
  counts on mobile, and an artwork agenda linking to the event detail pages. Includes Today,
  month navigation, day selection, and recovery from an empty month.
- Event cards and detail pages use supplied media or the generated Alliance artwork, including
  failed-image fallback. Details prioritize artwork and practical metadata with explicit GMT times.
  Registration forms and their open/closed rules are preserved.
- Team dialogs reuse generated artwork around available portraits and show a role-specific SVG
  watermark. Grow entrance animation respects reduced motion; biographies remain inside dialogs.
- Shared route loading and donation verification use skeletons; calendar loading matches its layout.
- Verification: production build and two filter tests passed. Calendar interaction test
  could not start its worker under system load. Browser connection repeatedly timed out/disconnected;
  final visual/responsive and profile-dialog checks remain unverified.

### Event-card refinement

- Desktop now shows one compact split card per row: artwork on the left, details on the right.
- Mobile remains vertical with type, date/time, title, location, and one detail link. Description,
  host credentials, and registration are available in the detail page; desktop retains registration.
- List skeletons match the responsive split layout. Final filter checks also passed directly in Node
  after the filter-options refactor; the Vitest retry could not start a worker.

- Final split-card verification: production build, changed-file lint, formatting, direct filtering
  checks, and diff checks passed. Type checking identified two imports bypassing the shared Stack
  wrapper; both were corrected. The rerun was stopped under sustained system load and is unverified.
  Browser visual checks remain unavailable; no live registrations were submitted.

## 18. Admin event management and Cloudinary images (5 September 2026)

- Added event image upload, replacement, preview, and removal to the editor using the existing
  signed Cloudinary flow. Save/close waits for uploads; failed replacements retain the prior asset.
- Corrected shared uploader guidance to the server's 5 MB limit and supported formats. Validates
  dropped files, prevents overlapping uploads, permits retrying the same file, and validates returned
  media metadata before it reaches the form.
- Admin list cards and calendar agendas show uploaded media or the generated Alliance artwork.
  Existing events open a detail dialog with an Edit action; date buttons create new events separately.
- Calendar displays event titles/time/status, has a mobile agenda, and anchors month navigation on
  day one to avoid skipping February or crossing the year incorrectly. All event pages are loaded.
- Added icons to description, venue, date/time, host, registration and other editor labels; displayed
  the editor's local timezone and added date/schema validation with visible save errors.
- Event PATCH accepts null for clearable fields and uses MongoDB $unset to remove saved values.
  Omitted fields preserve their current value. Explicitly removed create defaults from PATCH to avoid
  inadvertently resetting publication status, registration settings, or questions.
- Verification: nine focused tests passed (three persistence/date tests, two signed-upload tests,
  two PATCH-contract tests, two calendar navigation tests). Shared build and admin production build
  passed. Built-package checks also verify omitted values do not acquire defaults.
- Live check: admin preview reached sign-in after correcting an unavailable icon import. User agreed
  to sign in; authenticated edit/upload verification remains pending. No live content or media was
  created or modified. API clearing/PATCH fixes require deployment alongside the updated admin.
- Changed-file lint and diff checks passed. Admin/API type checks are still running under sustained machine load.
