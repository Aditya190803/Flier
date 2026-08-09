# Scheduled Sending

Queue a campaign in the composer and deliver it later with the browser closed.

## Architecture

Interactive sends use the Gmail access token in the user's NextAuth session.
Scheduled sends instead need:

1. an encrypted Google refresh token that survives the browser session; and
2. a long-running worker that checks for due campaigns.

Heroku Postgres stores both the campaign queue and encrypted refresh tokens.
On Heroku, the always-on web dyno starts an in-process clock that polls every
minute and executes due work without depending on a long-running HTTP request.

| Piece                          | Path                                        |
| ------------------------------ | ------------------------------------------- |
| Postgres schema                | `db/schema.sql`                             |
| Database connection pool       | `lib/db.ts`                                 |
| Encryption for secrets at rest | `lib/crypto/secret-box.ts`                  |
| Offline Google token exchange  | `lib/services/oauth-token-store.ts`         |
| Scheduled campaign persistence | `lib/services/scheduled-campaign-store.ts`  |
| Delivery worker                | `lib/services/scheduled-campaign-worker.ts` |
| Heroku web startup hook        | `instrumentation.ts`                        |
| Clock loop                     | `scripts/scheduled-clock.ts`                |
| CRUD API                       | `app/api/scheduled-campaigns/route.ts`      |
| Manual worker endpoint         | `app/api/cron/send-scheduled/route.ts`      |
| Composer controls              | `components/compose/delivery-options.tsx`   |
| Management page                | `app/(app)/scheduled/page.tsx`              |

Attachments remain in Appwrite Storage during this migration phase. Postgres
stores only their durable Appwrite references.

## Lifecycle

```text
scheduled ──(worker claims)──> processing ──┬──> sent
    ^                                       ├──> partial
    │                                       └──> failed
    └──(more work or transient error)───────────┘

scheduled ──(user)──> cancelled
```

`processing` is a recovery lease. The worker atomically claims one due row
with `FOR UPDATE SKIP LOCKED`, preventing concurrent worker instances or a
manual trigger from claiming the same campaign. A worker that dies leaves
`locked_at`; rows
older than `SCHEDULED_LOCK_STALE_MS` are returned to the queue.

## Chunking and delivery guarantees

A pass processes email for up to `SCHEDULED_CRON_BUDGET_MS` (currently 45
seconds), persists recipient results in the existing Appwrite `campaigns`
collection, and returns unfinished campaigns to the Postgres queue.

Delivery is **at least once**. Gmail accepting a message and recording the
result are separate operations. If the worker dies between those operations,
the final in-flight recipient can receive a duplicate on retry.

## Failure handling

- Transient database, Gmail, or network failures return the campaign to
  `scheduled`, up to `SCHEDULED_MAX_ATTEMPTS`.
- Revoked Google authorization is terminal. The token is marked revoked and
  the campaign becomes `failed`.
- Scheduling returns `412 REAUTH_REQUIRED` when no usable offline grant exists.
- Logout and GDPR deletion remove the stored grant; queued campaigns can no
  longer send for that account.

## Configuration

```bash
# Heroku Postgres sets this automatically.
DATABASE_URL=postgres://...
DATABASE_POOL_SIZE=5

# Polling interval for the in-process clock; minimum 15 seconds.
SCHEDULED_CLOCK_INTERVAL_MS=60000

# Protects the optional manual worker endpoint.
CRON_SECRET=

# Generate with: openssl rand -base64 32
TOKEN_ENCRYPTION_KEY=
```

Apply the idempotent schema locally or manually in production with:

```bash
npm run db:migrate
```

Heroku runs this command automatically during the `release` phase. Only one
Basic web dyno is required:

```bash
heroku ps:scale web=1 clock=0
```

The web dyno starts the clock through `instrumentation.ts`. This keeps the app
within one dyno while preserving one-minute polling. Campaign claims remain
atomic if the app is scaled later. See `docs/HEROKU_DEPLOYMENT.md` for complete
setup.

## Existing users

The refresh token is written on sign-in. Users whose session predates this
feature must sign out and back in before scheduling. Google OAuth requests
offline access with explicit consent.

Any experimental scheduled campaigns or OAuth tokens previously stored in
Appwrite are not read after this migration. The feature was not yet released;
if those collections contain data that must be preserved, export it before
removing them.

## Local testing

Start Postgres, set `DATABASE_URL`, then run:

```bash
npm run db:migrate
npm run scheduled:clock
```

The manual endpoint can run one pass while the development server is active:

```bash
curl -X POST http://localhost:3000/api/cron/send-scheduled \
  -H "Authorization: Bearer $CRON_SECRET"
```

A successful pass reports `{ reclaimed, claimed, processed, durationMs }`.
