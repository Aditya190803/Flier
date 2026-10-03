# Background delivery

Run `vp run db:migrate` before deploying this layer, then keep `vp run scheduled:clock` running. Both Send now and future campaigns use the queue. Google offline access must be configured; reconnect from Delivery & Recovery if the grant was revoked. The composer uploads attachments and freezes recipient fields when a campaign is queued.

PostgreSQL owns per-recipient progress. A recipient is reserved just before Gmail is called; completed results are persisted before moving on. Worker interruptions and ambiguous network/5xx outcomes become uncertain and are never automatically resent. Check Gmail Sent, then explicitly mark an uncertain recipient sent or not sent. A retry preserves successes, exclusions and unresolved uncertainty. Cancellation stops before the next recipient; an in-flight call may complete.

Appwrite campaign history is a projection. Existing queue jobs migrate their historical results before sending; failed legacy lookups stop progress instead of starting fresh. Gmail and PostgreSQL cannot commit atomically, so uncertain outcomes still require a human decision.

The health display reports the last worker tick and overdue jobs. A missing heartbeat means an administrator should inspect the clock process. It is not proof that Google accepted every message or that mail reached an inbox.

`QUEUE_TEST_DATABASE_URL` must explicitly name a disposable PostgreSQL database for `vp exec tsx scripts/verify-delivery-queue.ts`. The script creates and removes its own random schema, verifies concurrent claims/reservations and recovery, and never defaults to the application's database URL. CI runs this against its isolated PostgreSQL service.
