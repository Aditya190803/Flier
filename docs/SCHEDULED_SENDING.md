# Scheduled Sending

Queue a campaign in the composer and have it delivered later, with the browser
closed. This document covers how it works and what has to be configured.

## The core problem

Every other send path in the app uses the Gmail access token from the user's
NextAuth session cookie. A campaign scheduled for 6am Tuesday has no session
cookie — there is no browser involved at all.

So scheduled sending needs two things the rest of the app doesn't:

1. **A stored, long-lived credential.** The user's Google _refresh token_ is
   persisted (encrypted) in Appwrite and exchanged for a fresh access token at
   send time.
2. **Something that wakes up.** A Vercel Cron job polls for due campaigns.

## Components

| Piece                                         | Path                                            |
| --------------------------------------------- | ----------------------------------------------- |
| Encryption for secrets at rest                | `lib/crypto/secret-box.ts`                      |
| Refresh-token store + offline token exchange  | `lib/services/oauth-token-store.ts`             |
| Document (de)serialization, due/stale queries | `lib/services/scheduled-campaign-store.ts`      |
| CRUD API (create, reschedule, cancel, delete) | `app/api/appwrite/scheduled-campaigns/route.ts` |
| Cron worker                                   | `app/api/cron/send-scheduled/route.ts`          |
| Compose UI (Send now / Schedule / Draft)      | `components/compose/delivery-options.tsx`       |
| Management page                               | `app/(app)/scheduled/page.tsx`                  |
| Time helpers shared by both UIs               | `lib/schedule.ts`                               |

Two Appwrite collections are added by `bun run appwrite:setup`:

- `scheduled_campaigns` — the queue. Holds a full snapshot of the campaign
  (recipients, personalization rows, attachment references, Cc/Bcc), because
  the worker can't reconstruct any of it from the composer.
- `oauth_tokens` — one row per user, holding an AES-256-GCM ciphertext of the
  Google refresh token. Never a plaintext token.

## Lifecycle

```
scheduled ──(cron claims)──> processing ──┬──> sent
    ^                                     ├──> partial   (some recipients failed)
    │                                     └──> failed
    └──(more work left, or transient error)───┘

scheduled ──(user)──> cancelled
```

`processing` is a **lease**, not a user-visible state. A cron pass claims a due
row by moving it to `processing` and stamping `locked_at`; it either finishes
the campaign or drops it back to `scheduled` to continue on the next tick.

## Chunking and delivery guarantees

The worker is time-budgeted the same way `/api/send-email` is
(`SCHEDULED_CRON_BUDGET_MS`, currently 45s against a 60s `maxDuration`). A
campaign too large for one pass sends what it can, persists progress, and
resumes on the next tick.

Progress lives in the existing `campaigns` collection keyed by `campaign_id`
(see `lib/services/campaign-send-state.ts`). On resume, recipients already
recorded as processed are filtered out, so normal multi-tick delivery does not
send them twice.

Delivery is **at least once**, as with most email workers: Gmail accepting a
message and Appwrite recording that result are separate operations. If a worker
is killed in that narrow gap, the retry can send that recipient again. The
configured cron interval (5 minutes) is longer than the worker's 60-second
limit, preventing scheduled invocations from overlapping; external schedulers
must provide the same guarantee.

A worker killed mid-send leaves its row claimed. `reclaimStaleCampaigns`
re-queues anything held past `SCHEDULED_LOCK_STALE_MS` (10 minutes).

## Failure handling

- **Transient errors** (network, Appwrite hiccup) → back to `scheduled`,
  retried next tick, up to `SCHEDULED_MAX_ATTEMPTS` (5).
- **Revoked Google access** (`invalid_grant`: consent withdrawn, password
  reset) → terminal. The stored token is marked revoked and the campaign is
  marked `failed` with an actionable message. Retrying can't help.
- Creating a scheduled campaign fails with **412 `REAUTH_REQUIRED`** when no
  usable refresh token is stored, so users find out at schedule time rather
  than at send time.

## Personalization

Unlike the interactive path — where `/api/send-single-email` substitutes
placeholders per request — the worker resolves `{{placeholders}}` up front
from the snapshotted `csv_data`, then hands finished messages to
`EmailService.sendPersonalizedBatch`. Both the original and lowercased column
keys are exposed, so `{{Name}}` and `{{name}}` both resolve.

## Configuration

```bash
# Required in production. Vercel Cron sends it as a bearer token.
CRON_SECRET=

# Recommended. openssl rand -base64 32
# Without it, the key is derived from NEXTAUTH_SECRET — which means rotating
# NEXTAUTH_SECRET invalidates every stored grant and forces re-authentication.
TOKEN_ENCRYPTION_KEY=
```

The cron schedule lives in `vercel.json`:

```json
{ "path": "/api/cron/send-scheduled", "schedule": "*/5 * * * *" }
```

**Delivery granularity is the cron interval.** At `*/5` a campaign scheduled
for 09:02 sends at 09:05. Tighten to `* * * * *` for minute-level accuracy.

> Vercel's Hobby plan only permits **once-daily** cron invocations, which makes
> scheduling effectively unusable there. Minute- or five-minute-level crons
> require Pro. On another host, hit `POST /api/cron/send-scheduled` with
> `Authorization: Bearer $CRON_SECRET` from any scheduler.

## Existing users

The refresh token is written on sign-in. Anyone with a session that predates
this feature has no stored token and will get `REAUTH_REQUIRED` when they try
to schedule — signing out and back in fixes it. The OAuth config already
requests `access_type: offline` with `prompt: consent`, so no consent-screen
changes are needed.

Explicitly signing out revokes and deletes the stored Google grant. Any queued
campaign that becomes due afterward fails rather than sending under a signed-out
account.

## Testing locally

```bash
# CRON_SECRET is optional outside production
curl -X POST http://localhost:3000/api/cron/send-scheduled

# With a secret configured
curl -X POST http://localhost:3000/api/cron/send-scheduled \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response reports what the pass did: `{ reclaimed, due, processed[], durationMs }`.
