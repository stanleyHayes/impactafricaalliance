# Social publishing

Publishing an update from the dashboard to Facebook, Instagram, LinkedIn and X.

## How it works

An administrator writes the update once, chooses destinations, then reviews the
copy each network will get before anything is sent. Publishing creates one
queued record per destination and returns immediately; a worker does the
talking to providers.

That separation is the point. A slow Instagram media container or a
rate-limited X call is never the editor's problem, and a failure on one
destination cannot undo a success on another.

```
Compose  →  Choose destinations  →  Preview and edit per network  →  Publish or schedule
                                                                      │
                                                          one queued record per destination
                                                                      │
                                                            worker  →  provider adapter
                                                                      │
                                                    published / failed, with the post URL
```

## Architecture

| Piece | Where | Responsibility |
| --- | --- | --- |
| Capabilities | `packages/shared/.../social-publication.ts` | What each destination accepts, as data |
| Formatters | `packages/shared/.../social-content.ts` | Deterministic per-network copy |
| Adapters | `apps/api/src/providers/social/destination-adapter.ts` | One per destination; the only provider-specific code |
| Retry policy | `apps/api/src/modules/social/publication-retry.ts` | Transient vs permanent, backoff, error sanitising |
| Service | `apps/api/src/modules/social/social-publication.service.ts` | Queueing, claiming, running, retry, cancel |
| Worker | `apps/api/src/modules/social/social-publication.worker.ts` | Drains the queue on an interval |

Adding a network means writing an adapter and adding a capability entry.
Nothing in the article model changes.

### Why an interval, not a broker

This deployment runs a single API instance and posts a handful of updates a
week. Adding Redis for that would be infrastructure nobody asked for. The claim
is atomic at the database (`findOneAndUpdate` from `queued` to `processing`),
so moving to several instances later does not risk double-posting.

## Reliability

- **Idempotency.** Each record is keyed on article, connection, destination,
  scheduled time and caption. Submitting the same publication twice returns the
  same record rather than posting twice.
- **Retries.** Transient failures — 5xx, 429, and requests that never got an
  answer — retry with exponential backoff plus jitter, up to five attempts. The
  jitter matters: without it every destination queued in one outage returns at
  the same instant and reproduces it.
- **No pointless retries.** 401 and 403 mark the connection `reauth_required`
  and stop; the dashboard then offers Reconnect. Other 4xx are the request's own
  fault and are not repeated.
- **Partial success is shown as such.** Retry is offered per destination, so the
  ones that worked are never sent again.

## Security

- OAuth exchanges and provider calls happen only on the backend.
- Tokens are encrypted at rest with `SOCIAL_TOKEN_ENCRYPTION_KEY` and never
  appear in any API response — the connections endpoint returns account
  identity and status only.
- Provider errors are sanitised before storage: tokens, bearer headers and
  client secrets are redacted, because a provider's error body echoes request
  context and that is exactly where they surface.
- OAuth `state` is validated on callback.

## Provider setup

Each provider needs an application in its own developer console, and the
redirect URI registered there must match exactly.

| Provider | Console | Redirect URI |
| --- | --- | --- |
| Meta | https://developers.facebook.com/ | `<SOCIAL_OAUTH_REDIRECT_BASE>/api/social/meta/callback` |
| LinkedIn | https://www.linkedin.com/developers/ | `<SOCIAL_OAUTH_REDIRECT_BASE>/api/social/linkedin/callback` |
| X | https://developer.x.com/ | `<SOCIAL_OAUTH_REDIRECT_BASE>/api/social/x/callback` |

Notes that cost time if missed:

- **Facebook** publishes to Pages, not personal profiles. Production access for
  people outside the app's development roles needs Meta App Review.
- **Instagram** requires a Professional (Business or Creator) account linked to
  the Page, and publishes in two steps: a media container is created, then
  published. The image must be at a URL Instagram can fetch for itself, so a
  Cloudinary URL works and a signed one-time URL does not.
- **LinkedIn** organisation publishing needs the right Page role on the member's
  account plus the organisation product on the app.
- **X** API access is paid. Quota and billing failures surface as provider
  errors on the publication record.

Verify each provider's current documentation before going live; their
permissions and review requirements change.

## Not supported

**WhatsApp Channel publishing.** There is no official API for it. The dashboard
does not offer it, and it must not be simulated with browser automation. The
WhatsApp Business Platform is for opted-in subscriber messaging, which is a
different thing.

**Threads.** Modelled as its own destination and connection, but no adapter is
written, so it is reported as not enabled rather than silently queued.

## Single tenant

The build spec describes `organization_id` on every table. This deployment
serves one organisation, so that column would hold one value everywhere and
enforce nothing. Authorisation is by admin role instead. Introducing real
tenants means adding the column and scoping the queries in the service — the
adapters and formatters are unaffected.
