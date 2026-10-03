# Flier Pricing Design

**Date:** 2026-07-13  
**Status:** Approved for implementation  
**Payments:** Razorpay (India) — not Stripe

## Goals

- Freemium with hard server-side limits
- Monetize analytics without raising send volume (Insights)
- Full product on Pro (500 emails/day = free Gmail ceiling)
- Enterprise = contact sales only, no public price
- Monthly + annual for paid self-serve tiers

## Tiers

|                             | Free  | Insights | Pro      | Enterprise |
| --------------------------- | ----- | -------- | -------- | ---------- |
| Monthly                     | ₹0    | ₹299     | ₹999     | Contact    |
| Annual                      | ₹0    | ₹2,990   | ₹9,990   | Contact    |
| Emails / day                | 100   | 100      | **500**  | Custom     |
| Emails / month              | 2,000 | 2,000    | 10,000   | Custom     |
| Contacts                    | 1,000 | 5,000    | 25,000   | Custom     |
| Basic analytics             | ✅    | ✅       | ✅       | ✅         |
| Advanced analytics + export | ❌    | ✅       | ✅       | ✅         |
| A/B, webhooks, teams        | ❌    | ❌       | ✅       | ✅         |
| Checkout                    | —     | Razorpay | Razorpay | Sales only |

Annual ≈ 2 months free (10× monthly).

## Rules

- Billing unit: **per user account** (Google login email)
- Server enforces all limits; UI gates are UX only
- Gmail quota errors still surface when Gmail is the bottleneck
- Google Workspace: Free + self-serve Insights/Pro allowed; soft CTA to Enterprise for SSO / invoice / custom limits
- Cancel: paid until period end, then Free
- Downgrade over contact cap: no mass-delete; block new imports until under cap
- Failed payment: short grace then Free
- Enterprise plan granted manually (or via sales ops) with optional limit overrides on the subscription doc

## Architecture

1. **`lib/plans.ts`** — plan ids, prices, limits, feature flags (source of truth)
2. **Appwrite `subscriptions`** — one doc per user: plan, status, Razorpay ids, period end, optional limit overrides
3. **Usage counters** — daily + monthly email counts (in-memory with optional Redis later)
4. **`getUserPlan` / `assertFeature` / `assertEmailQuota` / `assertContactQuota`**
5. **Razorpay** — 4 plan ids (Insights/Pro × monthly/annual); webhook flips plan
6. **UI** — `/pricing`, Settings → Billing, `PremiumGate`, usage meter

## Enforcement points

| Action                                    | Check                                 |
| ----------------------------------------- | ------------------------------------- |
| send-email, send-single-email, send-draft | Daily + monthly email quota           |
| Contact create / bulk import              | Contact cap                           |
| Insights export / advanced analytics APIs | `advancedAnalytics` / `exportReports` |
| A/B create                                | `abTesting`                           |
| Webhook create                            | `webhooks`                            |
| Team create                               | `teams`                               |

## Razorpay flow

1. Dashboard plans → env plan ids
2. `POST /api/billing/checkout` creates subscription, returns id for Checkout
3. Client opens Razorpay Checkout (UPI / cards / netbanking)
4. `POST /api/billing/webhook` verifies signature; activates / renews / cancels
5. Settings → Billing: plan, usage, cancel, upgrade

## Env

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_INSIGHTS_MONTHLY=
RAZORPAY_PLAN_INSIGHTS_ANNUAL=
RAZORPAY_PLAN_PRO_MONTHLY=
RAZORPAY_PLAN_PRO_ANNUAL=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions
```

## Phases

- **P0:** plans config, enforce limits/features, usage UI, manual plan grant
- **P1:** Razorpay checkout + webhook + billing settings
- **P2:** pricing page polish, enterprise form, annual toggle UX

## Out of scope (v1)

Stripe, seat billing, coupons, trials, GST invoice PDFs, overage packs, hard Workspace paywall
