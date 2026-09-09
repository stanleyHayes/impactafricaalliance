# Admin page and field review — 9 September 2026

Status: implementation verified. Component tests, API integration tests and builds are recorded below.
Production deployment and an authenticated production browser walkthrough have not been performed.

## Page coverage

| Page / records | View | Edit | Delete / other actions | Permission rule |
| --- | --- | --- | --- | --- |
| Submissions and contact, partner, mentor/volunteer, job inboxes | Explicit View action opens `/submissions/records/:id`, showing complete payload, timestamps and consent evidence | Dedicated `/submissions/records/:id/edit` with named steps and final review | Confirmed Delete; inline status update | Independent `submissions:read/update/delete`, enforced by API |
| Articles, stories, team, partners, reports, jobs, gallery, offices, announcements, popups, pillar images, site images, statistics and page settings | Existing configured field detail views retained | Existing short dialogs or dedicated stepwise editors retained | Delete no longer inherits Edit permission; Actions column labelled | Separate resource Read/Create/Update/Delete |
| Events, calendar and event detail | View action, direct detail route, complete event description/questions/schedule and attendee directory | Existing dedicated stepwise editor | Existing confirmed Delete and QR tools | Separate `events:read/create/update/delete` |
| Event registrations | Existing expandable attendee responses and CSV export | Original attendee responses are not rewritten | Existing read/export workflow | `events:read` |
| Event messages | Existing message history and previews | Existing message composer | Sending requires `events:create`; sent messages are historical records | Events permission plus existing authentication |
| Reviews and event review queue | Full-record View | Status and private rejection reason; existing Publish/Reject shortcuts retained | Confirmed Delete refreshes the event's published rating | New `reviews:read/update/delete` permissions in the permission matrix and API |
| Subscribers | All stored fields, including consent and WhatsApp opt-in metadata | Name and source | Confirmed Delete | Separate `subscribers:read/update/delete`; independent of submissions permissions |
| Donations | Full transaction details through View in both table and cards | Transaction amounts/status remain provider-managed | No arbitrary financial-record deletion endpoint was added | Existing Admin role plus `donations:read`; payment configuration requires Update |
| Privacy requests | Complete request details, notes, status and timestamps | Notes editor and existing status workflow | Confirmed Delete removes the request record; fulfilling a data-erasure request remains the existing separate workflow | Separate `privacy-requests:read/update/delete` |
| Media library | Explicit View and complete image preview | Existing description, shelf and tags editor | Explicit confirmed Delete of catalogue entry | Separate `media-library:read/update/delete`; signing uploads requires `media:create` |
| Users | Complete public user DTO and permission list | Name/active status in a short editor; separate Permissions action opens stepwise access editor | Existing final-admin protection retained on Delete; Create/Invite gated | Existing Admin role plus independent `users` action permissions |
| Site settings | Existing complete grouped settings flow | Final save requires `site-settings:update`, including keyboard submit | Singleton settings use Save rather than item deletion | Read and Update enforced by API |
| Social connections | Existing provider cards/status | Existing admin-only connect/configure workflow | Existing disconnect controls | Existing Admin role retained |
| Dashboard and analytics | Aggregate views, filters and links retained | Not item-editing pages | No artificial CRUD controls on aggregate metrics | Existing authenticated role requirements; submission banner gated by Read |
| Account profile/edit, password, MFA, preferences and user guide | Existing account-specific views retained | Existing self-service controls retained | Existing MFA disable and immediate-save preferences retained | Current authenticated account |
| Account notifications and notification bell | Submission notification access requires Read | Mark read / Mark all read requires Update | Links and notification preferences retained | Submission permissions match the inbox |
| Login, password reset and invitation acceptance | Existing public authentication flows | Existing purpose-specific forms | No admin item actions | Existing token and authentication contracts retained |

## Field and behaviour checks

- Contact: name, email, subject, message.
- Partner: organisation name, contact name/email, country, partnership interest, message.
- Volunteer: name/email, country, expertise, optional monthly hours, message.
- Job: role slug/title, name/email/phone/country, LinkedIn/portfolio URLs, full cover letter,
  résumé URL and media identifier.
- Read views preserve nested objects/arrays, false, zero, multiline text and empty values. HTTP(S)
  attachment links open separately. Consent, consent version and consent timestamps remain viewable
  and cannot be forged by admin edits. Subscriber email/WhatsApp consent evidence remains unchanged
  by the name/source editor.
- Submission updates validate against the original submission type. Missing optional monthly hours
  can be cleared. Unknown existing payload fields survive updates and remain visible in details.
- Steps preserve values on Back, validate before Continue, and only save from the final review.
  Failed saves preserve edits and show an actionable error. Direct edit URLs check permissions
  before fetching the record.
- Record deletion requires confirmation and disables actions while the request is pending. API
  failures stay visible. List caches refresh after successful mutations; review changes also refresh
  event ratings.
- CMS, submissions, subscribers, donations, privacy and media lists now fetch all API pages before
  client pagination/search, instead of silently hiding records beyond the first 100.
- Navigation follows resource Read permissions; existing role restrictions on Users, Donations and
  Social connections are retained.

## Rollout note

Reviews now has its own permission group. Role templates include it; users with custom saved grants
need the appropriate Reviews permissions assigned through Users → Permissions. Tokens must be
refreshed after changing grants. No custom permissions were automatically broadened.

## Verification

Final result: **90 admin + 132 API + 126 shared tests passed (348 total)**. Admin and API
builds passed. ESLint and `git diff --check` passed. The admin build reports its existing
large-bundle advisory; it does not prevent the build.

- Admin component suite: includes new complete-detail, restricted-user, direct-edit denial,
  step-validation, failed-save retention, deletion-confirmation and pagination regression tests.
- API suite: all four submission payload types, subscriber consent preservation, independent action
  permissions, missing-record/invalid-ID handling, and review-deletion rating refresh.
- Admin and API builds; shared schema tests; ESLint; `git diff --check`.
- No production records were edited or deleted during verification.
