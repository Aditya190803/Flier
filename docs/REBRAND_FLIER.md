# EchoMail → Flier rebrand

## Code changes summary

- `lib/brand.ts` — product name, webhook header names
- `lib/webhook-delivery.ts` — signed outbound webhooks (`X-Flier-*` + legacy signature header)
- `lib/storage-migration.ts` — copies legacy `echomail_*` localStorage keys once
- `public/manifest.json` — PWA manifest for Flier
- `.env.example` — documented env template
- Service worker cache bumped to `flier-*-v2`
- Redis/cache prefix: `flier:`
- Webhook docs: `X-Flier-*`; sample code accepts `x-flier-signature` or legacy `x-echomail-signature`

---

## Domain cutover checklist

Order: Heroku domain → DNS → env → OAuth → smoke test → retire old domain.

### 1. Domain + DNS

- [ ] Register **`sendflier.tech`** (if not already)
- [ ] Run `heroku domains:add sendflier.tech` and `heroku domains:add www.sendflier.tech`
- [ ] Run `heroku domains` and point DNS to the returned targets
- [ ] Wait for DNS and Heroku Automated Certificate Management to report healthy

### 2. Heroku config vars

Set production values with `heroku config:set` or the Heroku dashboard:

| Key                                         | Value                       |
| ------------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_APP_URL`                       | `https://sendflier.tech`    |
| `NEXTAUTH_URL`                              | `https://sendflier.tech`    |
| `NEXTAUTH_SECRET`                           | keep existing (or rotate)   |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | same Google project is fine |
| Appwrite / Redis / others                   | unchanged                   |

- [ ] Set the two URL vars above
- [ ] Redeploy after env changes

### 3. Google OAuth

[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → OAuth client:

**Authorized JavaScript origins**

- [ ] `https://sendflier.tech`
- [ ] Keep `https://echomail.adityamer.dev` until cutover is solid
- [ ] `http://localhost:3000` for local

**Authorized redirect URIs**

- [ ] `https://sendflier.tech/api/auth/callback/google`
- [ ] Keep `https://echomail.adityamer.dev/api/auth/callback/google`
- [ ] `http://localhost:3000/api/auth/callback/google`

OAuth changes can take a few minutes to propagate.

### 4. Local (optional)

Dev stays on localhost — no need to point local at the new domain:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

### 5. Smoke test on new domain

- [ ] Open `https://sendflier.tech`
- [ ] Sign in with Google (full OAuth round-trip)
- [ ] Compose + send a test email
- [ ] Open a tracked link / pixel if tracking is used
- [ ] Confirm webhooks still fire (`X-Flier-Signature`; legacy `X-EchoMail-Signature` still accepted)

### 6. Old domain (`echomail.adityamer.dev`)

**Until verified:**

- [ ] Leave DNS + OAuth redirect live
- [ ] Keep the old host redirecting to `sendflier.tech`

**After a quiet week:**

- [ ] Remove old Google OAuth origin/redirect
- [ ] Remove the old domain from its previous host
- [ ] Optional: rename GitHub repo `EchoMail` → `flier`

### 7. Nice-to-haves (not blockers)

- [ ] Update external docs/bookmarks to `sendflier.tech`
- [ ] If Appwrite has platform host allowlists, add `sendflier.tech`
- [ ] Custom From domains later need SPF/DKIM — Gmail send path does not need this for app hosting

---

**Minimum path:** Heroku domain → DNS → set two env URLs → add Google redirect → redeploy → login smoke test.

**Do not remove** old OAuth/domain until smoke tests pass.
