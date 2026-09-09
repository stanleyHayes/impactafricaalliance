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
- **Admin forms**: more than five logical inputs require a dedicated create/edit page with named
  steps, preserved values, scoped validation, and a final submit action. Complex permission matrices
  follow the same rule. See [AGENTS.md](../AGENTS.md) and [form guidance](design/forms.md).

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
- Changed-file lint and diff checks passed. Follow-up verification completed: admin and API type
  checks passed, including the final event editor/calendar fixes.

## 19. Contact layout, public event icons, and QR downloads (5 September 2026)

- Replaced the tall contact-details card with a full-width direct-contact strip for email,
  WhatsApp, and the alternate phone. The form and compact enquiry routes sit alongside one another
  on desktop and use consistent visual/keyboard ordering when stacked on mobile.
- Offices now occupy a separate responsive section with addresses, phone links, directions,
  regional presence, and a social/website footer. Published offices and site-setting fallbacks are
  preserved; a single office fills the available row. Retained the brand palette and SVG watermark.
- Public event cards and calendar agenda entries now use matching date, time, venue, description,
  and host icons. Desktop split cards and the reduced mobile content remain intact.
- Confirmed the API QR generator encodes `/events/<id>` into its downloadable 720px PNG.
  Replaced the permanent admin QR cache with a fresh request on opening and a separate cache key
  from legacy hash URLs. Refresh uses a skeleton; errors hide stale downloads and offer Retry.
- Verification: 11 focused tests passed (five contact/CMS-link checks, one calendar interaction,
  three QR generator checks, two QR dialog/download checks). Marketing/admin production builds,
  marketing/admin/API type checks, changed-file lint, and diff checks passed.
- Browser visual and authenticated upload verification remain unavailable: the browser runtime
  reported no connected browser. No live content was changed and no deployment was performed.
  Existing downloaded or printed QR images must be regenerated after deploying current API/admin
  versions; those files cannot be changed by refreshing the dashboard.

## 20. Dedicated admin form pages and MUI scheduling (5 September 2026)

- Replaced event create/edit dialogs with `/events/new` and `/events/:eventId/edit` pages using
  Details, Schedule, Registration, and Review steps. Calendar day selection initializes 09:00 on
  that day; list and detail Edit actions open the dedicated editor. Existing records load directly
  with skeleton/error/retry states. Final review retains image/artwork and publication settings.
- Added MUI X DateTimePicker and Day.js for event start/end and registration closing time, including
  24-hour entry, local timezone display, desktop calendar/clock popovers and narrow/touch dialogs.
  Preserved UTC timestamps (including existing seconds/milliseconds), optional null PATCH clearing,
  historical-event editing, and date-order validation. Invalid optional dates cannot silently clear
  saved values. Uploads block step changes and final save.
- Nine long CMS forms now use `/content/:resource/new` and `/content/:resource/:id/edit` with named
  field groups and Review: articles, stories, team, offices, reports, jobs, gallery, stats, and page
  settings. Preserved image/file uploads, AI assistance, Markdown editors, previews, and roles.
  The field-count threshold automatically routes future forms with more than five fields.
- Site settings now uses nine focused steps, preserves changes across steps/refetches, and returns
  to hidden invalid fields on final validation. Corrected numeric popup delay input.
- Invitations and permission editing now use `/users/invite` and `/users/:userId/permissions` with
  Identity, Permissions, and Review. Preserved permission payloads, role behavior, and self-edit
  auth refresh. Short partner/pillar-image/direct-user forms remain dialogs.
- Recorded the standing admin form rule in root `AGENTS.md`, `docs/design/forms.md`, and README.
- Verification: 16 focused tests passed across event forms, CMS resource forms, site settings, and
  access forms. Event/settings tests also passed with `TZ=America/New_York`. Admin typecheck and
  changed-file lint passed; admin and marketing production builds passed after the MUI dependency
  addition. Diff checks passed.
- Browser verified calendar-to-create navigation, all four event steps, selected date/time reaching
  review, existing-event edit loading, desktop MUI calendar/time selection, and mobile calendar/time
  views with no horizontal page overflow at 390px. Restored viewport. No live forms were submitted,
  no records/media/permissions were changed, and no invitations were sent. No deployment performed.

## 21. Impact page theme visibility (5 September 2026)

- Paired metric, SDG, and report surfaces with theme-aware foregrounds. Light mode retains pale
  section backgrounds; dark mode uses dark surfaces and readable headings, descriptions, and icons.
  The featured statistic now has an opaque forest base behind its white label and gold number.
- Kept official SDG colors while choosing a readable header foreground for each color. Contribution
  labels and indices use theme text colors; decorative watermarks remain subtle on hover.
- Corrected report download/button contrast, report empty-state text, and faded Agenda labels.
  Shared gallery captions have a stable dark backing; gallery/metric skeletons use theme defaults.
  The optional CMS call-to-action uses dark text on its mint background.
- Verification: six existing Impact/counter tests, marketing typecheck, changed-file lint, and
  production build passed. Browser checks of 84 rendered section text color pairs passed in both
  desktop themes (minimum measured contrast 4.81:1), with visual checks of metrics, SDGs, and reports.
  Repeated color checks at 390px in both themes with no horizontal page overflow. No live content
  was changed; the original dark theme and desktop viewport were restored.

## 22. Contact office directory redesign (5 September 2026)

- Replaced the separate dark office cards with a connected directory beside the introduction and
  regional presence list. Country/city labels, office names, full addresses, and optional phone/map
  links remain backed by CMS data; site-setting fallbacks are preserved.
- Added custom inline SVG folded-map and street-map watermarks. Muted sage surfaces, softer text,
  small outline location icons, and fine dividers replace the black/green panels and bright mint pins.
  Decorative SVGs are hidden from assistive technology and cannot intercept pointer events.
- Verification: five existing Contact tests, marketing typecheck, changed-file lint, production
  build, and diff checks passed. Desktop light/dark visual checks confirm the new arrangement;
  rendered text contrast is at least 4.61:1 in light mode and 6.82:1 in dark mode. Checked both at
  390px with no horizontal page overflow; the full Nigeria address wraps without truncation.
  Restored the original dark theme and desktop viewport. No live CMS data was modified.

## 23. Horizontal-only admin form steps (5 September 2026)

- Set the shared form-step track to horizontal scrolling only. Removed MUI StepButton's negative
  margins and oversized padding, which extended its hit area beyond the track and caused vertical
  overflow. Kept full-width 60px-tall buttons and added an inset-safe keyboard focus outline.
- Browser measurements confirm scroll height equals track height (76px) on desktop and at 390px.
  Horizontal mobile scrolling reaches the final step; vertical wheel input leaves track scrollTop
  at zero. The fix applies to event creation/editing and the other shared admin form steppers.
- Verification: both existing EventEditor tests, admin typecheck, changed-file lint, production
  build, and diff checks passed. No event data was entered or saved.

## 24. Adaptive impact metric layout (5 September 2026)

- Replaced the nested, stretched metric groups with one ordered responsive grid. Two supporting
  metrics stack beside the featured metric; larger collections fill compact rows, with incomplete
  final rows sharing the available width. The featured metric spans at most two rows, so new rows
  never stretch it across the whole collection. Single/two-item layouts use a compact shared row.
- Supporting cards group their icon, number, and label together; wide cards place the label and
  number across the row. Typical desktop supporting cards are now 140px tall. Long labels wrap,
  long numbers use smaller type, and cards grow only as their content needs. Skeletons use the same
  count-driven grid; existing theme colors and reduced-motion behavior are retained.
- Removed the first-20-only stats fetch. All stats pages load in API order before the collection
  is returned, preserving inactive filtering, empty-state fallback, and query error behavior.
- Verification: 69 tests passed, including gap-free/ordered placement for counts 1–30 at both
  grid breakpoints and pagination across 41 metrics. Marketing typecheck, changed-file lint,
  formatting, production build, and diff checks passed.
- Browser verified totals 1, 2, 3, 4, 5, 6, 7, and 21 using the live page and local fixtures, both themes,
  and widths 320, 600, 899, 900, and 1200px. Long labels/numbers wrap without horizontal overflow.
  The live fourth metric automatically rebalanced the grid. Temporary fixtures were removed and
  the viewport restored; no CMS records were created or changed by this task.

## 25. Newsletter field corner alignment (5 September 2026)

- Moved the name/email backgrounds from the TextField wrappers onto their outlined input roots.
  The fill now follows the same 12px radius as the border, removing the visible 4px wrapper corners.
  Validation helper text remains outside the fill, and the existing focus halo is preserved.
- Verification: desktop browser checks in both themes, focus/error states, and a 390px mobile
  check passed with no horizontal overflow. Marketing typecheck, changed-file lint, formatting,
  and production build passed. Only empty-form validation was exercised; no subscription was sent.

## 26. Admin team thumbnail proportions (5 September 2026)

- Increased the shared media column to 80px with a fixed minimum and disabled thumbnail shrinking.
  The old 64px column left only 32px after cell padding, squeezing 40px photos into ovals.
- Replaced the raw image/empty box with MUI Avatar. Team portraits remain circular and show name
  initials when missing or broken; other media keeps its rounded corners and configured cover/contain
  fit, with an image icon fallback. Uploaded assets and team records are unchanged.
- Verification: measured the original live distortion, then verified the real registry/DataTable
  components in a temporary local preview after the admin server stopped and sign-in was required.
  Loaded, missing, single-name, and broken-image cases all remain 40×40px; desktop dark and 390px
  light layouts passed without page overflow. Temporary files were removed. Admin typecheck,
  changed-file lint, production build, and diff checks passed.

## 27. Compact CMS form review (5 September 2026)

- Replaced tall per-step cards and vertically stacked values with a shared `ResourceReview` summary.
  Joined sections use a compact title/edit column and aligned metadata columns on desktop; smaller
  containers move edit controls beside the heading and wrap fields into readable rows. Short values
  stay together while descriptions, rich text, and long values receive full-width space.
- Kept all fields, images, file links, resource-specific previews, zero/false values, and empty-state
  labels. Yes/No values use small outlined indicators. Edit controls have accessible section names
  and readable theme colors; form validation, uploads, navigation, and save behavior remain intact.
- Verified the actual component with stats, team, report, and article fixtures in both themes and
  at desktop, 800px, 390px, and 320px widths. The two desktop stat sections total 225px; long URLs and
  rich content wrap without page overflow. Authenticated live verification was unavailable, so the
  temporary preview used local data and was removed afterward; no CMS records were changed.
- All three ResourceFormPage tests passed, including strengthened review-edit/upload preservation
  and explicit-save coverage. Admin typecheck, changed-file lint, formatting, build, and diff checks
  passed.

## 28. Softer newsletter input surfaces (5 September 2026)

- Matched both newsletter inputs to the persistent green signup card with a muted #284239 fill,
  subtle resting/hover borders, warm light text, and sage placeholders in both themes. Kept the
  12px corner alignment and themed focus/error borders. Scoped autofill styling prevents MUI's
  blue autofill fill from replacing this surface.
- Verified both themes, typed text, focus styling, and the 390px mobile layout. Text/placeholder
  contrast exceeds 9.5:1/6.3:1 while card-to-field contrast is about 1.14:1. Marketing typecheck,
  changed-file lint, formatting, production build, and diff checks passed. No subscription was sent.

## 29. Shared adaptive impact metrics across marketing pages (5 September 2026)

- Home, About, and Impact now use one `ImpactMetrics` component and the existing count-aware grid.
  Removed About's three-item cap and Home's stretched side-by-side layout. The homepage introduction
  now sits above the full-width metric grid, so its text cannot stretch the cards. All active CMS
  figures appear in API order and use identical cards, typography, colors, and responsive placement.
- Added a meaningful inline SVG watermark to every card using the shared label/key icon resolver,
  including unknown/new categories. Watermarks are subtle, noninteractive, and hidden from assistive
  technology. Removed decorative card numbering to avoid overlap with long values. Existing count-up
  and reveal animations retain reduced-motion support.
- Replaced contradictory page-specific fallback counts with shared skeleton, empty, and retry states.
  The existing all-pages stats fetch is preserved; inactive records and zero values are handled
  consistently. No CMS records were created or modified.
- Verification: 79 focused tests cover all three page integrations, 41 metrics, additions/removals,
  ordering, watermarks, loading/empty/error behavior, and gap-free grid placement for counts 1–30.
  Live Home/About/Impact show matching figures and card dimensions. Browser fixtures verified
  counts 1, 2, 4, 7, and 21, long labels/numbers, both themes, and 600/390/320px layouts without page
  overflow. Temporary fixtures were removed and the original dark theme/desktop viewport restored.
  Marketing typecheck, changed-file lint, production build, and diff checks passed.

## 30. Account menu descriptions (5 September 2026)

- Added a concise one-line description beneath all seven account-menu actions, including the tour,
  user guide, and logout. Retained existing icons, grouping, and action handlers.
- Set a viewport-bounded menu width and allowed vertical scrolling on short screens. Browser checks
  verified light/dark readability, all descriptions without truncation at 320px, and keyboard access
  to the final item in a 480px-high viewport. Admin typecheck and changed-file lint passed.

## 31. Compact event-filter empty state (5 September 2026)

- Replaced the large centered no-results area with a compact, responsive panel shared by Explore
  and Calendar views. Added a custom inline SVG calendar/search illustration, subtle radar SVG
  watermark, muted surfaces, concise guidance, and one bordered Clear filters action.
- The empty state sits closer to the result count and replaces the duplicate toolbar reset action.
  Kept separate copy for an empty event collection, loading skeletons, retry behavior, and the
  calendar's existing day/month recovery. Reset clears search, type, and dates without changing views.
- Verified live filter recovery in both views, desktop light/dark themes, and 760/390/320px layouts
  without horizontal overflow. The desktop panel measures 174px high and the 390px mobile panel
  about 245px. Three existing discovery/calendar tests, marketing typecheck, changed-file lint,
  production build, and diff checks passed.

## 32. Careers and donation redesign (5 September 2026)

- Rebuilt the careers empty state as a responsive two-part invitation with role status, CV guidance,
  a direct careers email action, and briefcase/network SVG watermarks. Existing CMS job listings and
  application links remain in place. Careers and donation headers now use quiet themed surfaces.
- Replaced the donation impact cards with selectable, compact rows linked to the form amount.
  Added a separate muted form surface, SVG watermarks, clear selection states, grouped donor fields,
  and softer inputs. Existing tier descriptions, custom amounts, frequency, consent, and provider
  handoff behavior are retained.
- Added payment-method skeleton/retry states and a contact action when online giving is unavailable.
  Checkout remains disabled until a payment method is available. Fixed optional blank donor names
  being rejected by validation and made name errors visible.
- Four mocked donation tests pass, covering tier selection, monthly checkout payload, blank optional
  name, unavailable/loading methods, and lookup retry. Marketing typecheck, changed-file lint, format,
  and build checks passed. Browser verified both sections in light/dark themes and 390/320px sizing;
  no horizontal overflow. No live donation, email, or CMS update was submitted.

## 33. Colorful welcome popup (5 September 2026)

- Rebuilt the welcome popup with an original gold/coral/mint/lilac SVG composition, linework
  watermarks, a desktop split layout, and a compact mobile artwork banner. Added a warm gold action,
  editorial heading, themed cream/forest content surface, and a softened backdrop.
- Retained dashboard-controlled content, optional image, CTA destination, delay, session dismissal,
  and permanent opt-out. Missing or failed images fall back to the SVG artwork. Improved dialog
  naming for message-only content and linked the message as its accessible description.
- Verified desktop and mobile presentation, Escape dismissal, and scrolling at 320×568 without
  horizontal overflow. Marketing typecheck, changed-file lint, formatting, build, and diff checks pass.

## 34. Admin overview donation empty state (5 September 2026)

- Replaced the fixed-height dashed chart placeholder with a compact themed panel, custom SVG
  receipt/heart illustration, subtle watermark, and a direct donations link. Uses distinct copy for
  a first donation versus an empty six-month period, and review guidance for pending/failed payments.
- Preserved the real chart when monthly amounts exist, loading skeletons, totals, status counts,
  and provider breakdowns. Replaced user-facing “succeeded” wording in this panel with “completed.”
- Admin typecheck, changed-file lint, build, and diff checks pass. Verified all three empty variants
  in a temporary local preview in both themes and at 320px without overflow; desktop empty panels
  are approximately 158px high. The live dashboard initially rendered the new copy, then returned
  to sign-in after a refresh. Temporary preview files were removed; no donation data was changed.

## 35. Unified Get Involved tab colors (5 September 2026)

- Applied one muted, theme-aware header/body palette to Partner, Volunteer, Donate, and Careers.
  Removed tab-dependent bright mint surfaces; aligned icon tiles, supporting text, spacing,
  input fills, and primary submit colors. Retained decorative watermarks and existing form behavior.
- Open-job cards now use semantic borders and the same subtle surface tint as donation cards.
- Changed-file lint, marketing build, donation tests (4), and diff checks pass. Marketing typecheck
  is blocked by an unrelated About.tsx:793 TeamMember/SocialField websiteUrl mismatch.
  Browser verification was attempted but the preview became blank and browser calls timed out;
  full light/dark/mobile visual verification remains unconfirmed.

## 36. Sign-in identity and dedicated team profiles (5 September 2026)

- Rebuilt the sign-in composition around an original SVG illustration of people connected through
  opportunity, with forest, sage, ochre, clay, and lilac accents. Removed unsupported static impact
  figures, softened input fills, simplified the form frame, and added a compact mobile brand header.
  Existing credentials, MFA, reset, validation, redirects, and theme controls remain in place.
  The shared brand panel also updates the password-reset screen.
- Team biography links now open /about/team/:memberId. The dedicated page uses the existing public
  detail endpoint, a large portrait, existing generated artwork for absent/broken images, role-based
  SVG watermarks, full biography paragraphs, safe social links, and an anchored return to the team.
  Added route SEO, skeleton loading, unavailable/retry states, and reduced-motion-aware entrance.
- Rebuilt the shared package to refresh its existing team-link types. No API/schema, CMS content,
  credentials, or authentication contracts were changed in this slice.
- Both app typechecks, changed-file lint, production builds, and five profile/About tests pass.
  Admin build retains its existing large-chunk warning. Browser screenshot and DOM checks repeatedly
  timed out/detached, so visual verification across desktop/mobile and both themes is unconfirmed.

## 37. Landing headline animation inspired by Kedland (5 September 2026)

- Inspected Kedland's animated-hero-copy.tsx and associated CSS. Adapted its staggered word
  entrance, shine sweep, underline draw, and sparkle to IAA's existing headline and gold palette.
- Added HeroHeadline: the CMS text remains one accessible h1; community/communities gets the
  accent, with the final word as a fallback for alternate copy. Two decorative SVG sparkles settle
  with the entrance, without looping or restarting on background slideshow changes.
- Preserved ordinary word wrapping, capped stagger delays for longer CMS headlines, provided
  reduced-motion and forced-color fallbacks, and disabled the parent entrance for reduced motion.
- Marketing typecheck, changed-file lint, build, and diff checks pass. Browser screenshots and
  computed styles confirmed desktop and 390px mobile layouts without headline or page overflow.

## 38. Distinct Empowering and Africa headline accents (5 September 2026)

- Empowering now rises through a warm glow with an ascending gold sparkle. Africa uses a
  staggered letter turn in soft mint, plus a sparkle travelling along an arc around the word.
  Community retains its separate gold sweep and drawn underline.
- All effects settle after one entrance; reduced-motion and forced-color fallbacks cover the
  new letters and decorations. Original heading accessibility and CMS wording remain intact.
- Marketing typecheck, lint, build, and diff checks pass. Browser styles confirm distinct
  treatments; the 390px mobile screenshot shows readable text and no page/headline overflow.

## 39. Hero impact model entrance (5 September 2026)

- Added a one-time viewport entrance to the glass impact panel: a gentle lift, fade, and scale
  settle, followed by Skills, Community, and Partnership revealing in 120ms staggered steps.
- Reduced-motion users see the content immediately. Existing desktop visibility, copy, layout,
  and background slideshow are preserved; slideshow changes do not restart the entrance.
- Marketing lint/typecheck pass. Browser checks confirm the panel and every row finish visible.

## 40. More visible impact panel animation and replay (5 September 2026)

- Extracted HeroImpactModel and replaced the subtle reveal with a 42px lift, larger scale settle,
  300ms row staggering, rotating icon tiles, and separately entering text.
- Added an accessible replay button that retains focus. Visible dialogs and hidden browser tabs
  defer the entrance; hidden navigation dialogs do not block it. Reduced motion stays immediate.
- Browser replay verification caught and fixed the hidden-dialog trigger issue. Confirmed the
  panel returns to full opacity after the fix. Marketing lint/typecheck and diff checks pass.

## 41. Privacy and legal page redesign (5 September 2026)

- Unified Privacy Policy, Cookie Policy, Terms of Use, and Privacy Request with a compact themed
  header, page-specific SVG watermarks, icon/title/description navigation, and muted surfaces.
- Policy pages now use a narrower reading column, section dividers, a sticky desktop contents
  index derived from rendered headings (including CMS Markdown), and a compact mobile page grid.
  Existing policy wording and CMS overrides remain intact. Added a shared contact panel.
- Cookie Policy opens the existing cookie preference controls. Privacy Request has a focused
  form card, email icon, subdued input fills, pending controls, inline error recovery, and a themed
  success/reference panel. The endpoint, request types, schema, and success wording are preserved.
- Marketing build/typecheck and changed-file lint pass. Four tests verify policy navigation,
  updated section anchors, cookie preferences, form validation, retry, and the returned reference.
  Browser inspection repeatedly timed out; visual theme/mobile verification remains unconfirmed.
  No live privacy request was submitted.

## 42. Mission statement redesign and animated typography (5 September 2026)

- Replaced the centered mission strip with a balanced statement and three expressive keywords.
  Innovation, education, and empowerment use gold, sage, and lilac accents with matching icons.
- Added an original connected-path/arch SVG watermark, quieter themed surfaces, and a staggered
  text reveal with settling icons. Plays once on entering the viewport; reduced motion is immediate.
- Desktop and 390px mobile browser checks confirm readable layouts without overflow. Light-mode
  keyword colors use darker accessible tones. Marketing lint/build/diff checks pass.
- Full marketing typecheck was started but remained running after five minutes; its result is unconfirmed.

## 43. Navigation watermark contrast (5 September 2026)

- Desktop dropdowns and mobile navigation now share a theme-aware watermark color.
  Light mode uses forest green at 24% opacity; dark mode preserves its existing treatment.
- Browser loaded light mode, but dropdown inspection timed out, so visual confirmation in a
  real browser is still outstanding. Lint, marketing typecheck and build all pass, and the
  change was in the tree for the full marketing suite (21 files, 114 tests, green).

### Admin event detail and moderation follow-up — 2026-09-08

- Event calendar and card selections now open `/events/:eventId`, a dedicated detail page with cover artwork, schedule, description, host, registration settings, private joining link, custom questions, QR code and edit access.
- The page includes published rating distributions and an event-scoped moderation queue. `/reviews?eventId=:eventId` also opens the scoped queue; the global Reviews page remains available.
- Admin review queries filter by event before pagination/counting. Waiting, published and rejected reviews are paginated; moderators can publish or reject and revisit earlier decisions. Decisions invalidate rating and event caches.
- Verification: five dedicated-page/review UI tests and sixteen review-service tests pass; admin/API type checks and changed-file lint pass. The broader existing EventEditor calendar test timed out at both 5s and 15s; this is not recorded as passing.
- Browser: dedicated page and navigation inspected. The previous admin preview used the hosted API; local preview on 5299 now targets updated API on 4001 (background workers disabled for this verification). Sign-in is required before finishing authenticated local browser verification. No deployment performed.

### Admin visual redesign — 2026-09-08

Owner: Codex. Status: implementation and component visual review complete; authenticated page-by-page acceptance remains pending.

| Surface | Implemented treatment | Verification |
| --- | --- | --- |
| Shared page headings across CMS, operations, analytics, media and settings | Tinted header surface, prominent icon/title/description, count, actions and theme-aware decorative watermark | Light/dark component browser preview; 390px layout has no horizontal overflow |
| Dashboard | Watermarked metric cards, calmer panel headings, real resource icons replacing initial-letter tiles | Admin build and suite |
| Events and event detail | Icon/label/value schedule and registration details, section icons and watermarks, numbered question summaries | Existing event detail/editor tests; authenticated visual acceptance pending |
| Event question editor | Numbered cards, labelled move/remove controls, required status, responsive attendee preview and choice illustrations | Two regression tests cover multi-line choice entry and moving/removing questions while retaining settings; dark desktop and 390px visual review |
| CMS cards, detail dialogs and final form review | Shared semantic information blocks with contextual icons, readable labels and values; resource-card watermarks | Existing resource detail and form tests |
| Submissions, subscribers, donations, privacy requests and social connections | Icon-led metadata, donation watermarks, readable privacy guidance, consistent social account information and aligned actions | Admin suite; authenticated visual acceptance pending |
| Reviews | Watermark and inset comment treatment with responsive metadata | Existing review tests |
| Account pages | Watermarked account headings; repaired invalid CSS alpha expressions in profile, edit profile, password, notifications, settings and account navigation | Typecheck/lint; individual visual acceptance pending |
| Shared controls | Calmer table headers/toolbars, focus indicators, reduced-motion support, skip-to-content link, compact mobile step navigation | Component browser review and admin suite |

- Existing event-detail/moderation work and unrelated worktree changes were preserved. No API/auth contract changes, publication, or deployment were made by this design slice.
- Local admin preview is at `http://localhost:5299` and points to the local API on port 4001. Reload returned to sign-in; the API health and local CORS response are working. An authenticated session is still needed for the complete page-by-page walkthrough.
- The temporary component preview used sample content and was removed after light/dark desktop and 390px checks. Those checks verify shared components, not authenticated page integration.
- Final validation: admin lint, TypeScript/build, all 72 tests across 20 files, and `git diff --check` pass. Vite still reports the existing large-bundle advisory.

### Admin registration directory redesign — 2026-09-09

Owner: Codex. Status: implemented; focused checks pass; browser visual acceptance pending.

- Replaced the registration table with a themed audience header, prominent total, attendee initials, responsive directory rows and expandable contact/profile details and custom answers using shared InformationItem blocks.
- Added loading rows, actionable retry, an explanatory empty state and page ranges. Export remains explicitly scoped to the current page, preserves custom question columns and CSV escaping, and is disabled during loading/failure.
- Event-card registration counts use a themed treatment and open event details; zero counts remain hidden.
- Verification: 10 focused registration/CSV/event-detail tests, admin TypeScript, changed-file ESLint and diff checks pass. Local browser navigation to port 5299 returned connection refused; no browser or authenticated visual acceptance is claimed. Main-branch publication authorized on 2026-09-09; no deployment performed.

### Event communication UI redesign — 2026-09-09

Owner: Codex. Status: implemented and verified with automated checks; publication to main authorized.

- Identified the UI introduced by `6d254e7`: event messaging composer/history and automation timing fields in the editor.
- Redesigned messaging with a themed header, responsive composer/content-preview columns, character limits, explicit link inclusion, message review in the send confirmation, delivery statuses, expandable sent bodies, history retry and persistent send errors. No actual messages sent during verification.
- Split the eight-field registration step: Registration now has five fields; Questions & follow-up holds two automation timings and the question builder. Updated step validation, final action labels, review summary and form documentation. Existing direct routes, values and null-clearing contracts remain intact.
- Verification: 12 focused tests across messaging, event detail/editor and event-form suites pass; admin TypeScript, changed-file ESLint, production build and diff checks pass. Existing bundle-size advisory remains. Browser/mobile visual acceptance and live email delivery were not verified.
