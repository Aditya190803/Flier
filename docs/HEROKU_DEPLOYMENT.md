# Deploy Flier to Heroku

Flier runs on one always-on Basic web dyno. Next.js serves the application,
and its Heroku startup hook runs a clock in the same Node.js process to poll
Postgres every minute and send due campaigns.

Scheduled campaigns and encrypted Google refresh tokens live in Heroku
Postgres. Existing contacts, campaigns, templates, and attachment files remain
in Appwrite during this migration phase.

## 1. Create the app and database

Install and authenticate the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli), then run:

```bash
heroku login
heroku create <your-app-name>
heroku addons:create heroku-postgresql:essential-0
```

The Postgres add-on creates `DATABASE_URL` automatically. Essential-0 provides
1 GB of storage and 20 connections; the app defaults to a pool of five
connections. One Basic dyno plus Essential-0 Postgres fits within a $13 monthly
student credit at the documented $7 and $5 base prices. One-off dynos and other
add-ons can create additional usage.

## 2. Configure secrets

Copy the values from your production environment into Heroku config vars. Do
not commit them.

```bash
heroku config:set \
  NEXT_PUBLIC_APP_URL=https://<your-app-name>.herokuapp.com \
  NEXTAUTH_URL=https://<your-app-name>.herokuapp.com \
  NEXTAUTH_SECRET=<secret> \
  TOKEN_ENCRYPTION_KEY=<32-byte-base64-key> \
  CRON_SECRET=<secret> \
  GOOGLE_CLIENT_ID=<id> \
  GOOGLE_CLIENT_SECRET=<secret>
```

Also configure the existing Appwrite, tracking, Redis, and billing variables
listed in `.env.example`. Generate the token key with:

```bash
openssl rand -base64 32
```

Keep `TOKEN_ENCRYPTION_KEY` stable. Rotating it invalidates stored Google
refresh tokens and requires users to sign in again.

## 3. Deploy

The official Heroku Node.js buildpack uses Node and npm versions declared in
`package.json`. `Procfile` runs the Postgres schema during the release phase.

```bash
heroku git:remote -a <your-app-name>
git push heroku main
heroku ps:scale web=1 clock=0
```

Alternatively, connect the GitHub repository from the Heroku dashboard and
enable automatic deploys after CI passes.

`instrumentation.ts` starts the clock only on a Heroku `web.*` dyno. This
preserves one-minute polling without paying for a second continuously running
dyno. The loop catches pass failures, and Heroku restarts the whole process if
the web server exits. A restart can delay a campaign briefly; stale database
leases are recovered automatically. The interval can be changed with
`SCHEDULED_CLOCK_INTERVAL_MS` (minimum 15 seconds).

## 4. Configure OAuth and domains

Add this Google OAuth redirect URI:

```text
https://<your-app-name>.herokuapp.com/api/auth/callback/google
```

For a custom domain:

```bash
heroku domains:add sendflier.tech
heroku domains:add www.sendflier.tech
heroku domains
```

Point DNS at the targets returned by `heroku domains`, then set
`NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the final HTTPS origin. Add that
origin to Appwrite's platform allowlist as well.

## 5. Verify

```bash
heroku ps
heroku logs --tail
heroku pg:info
heroku run npm run db:migrate
```

Confirm that:

1. the web dyno starts and Google sign-in succeeds;
2. the web dyno logs `scheduled_campaign_pass` once per interval;
3. a test campaign moves from `scheduled` to `sent`;
4. logout removes the user's stored offline authorization.

Heroku Postgres requires SSL outside localhost. The application verifies the
server certificate and never writes refresh-token plaintext to the database.
