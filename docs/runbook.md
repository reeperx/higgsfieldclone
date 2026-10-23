# Runbook

Operating Vendo in production. Everything below is idempotent unless noted.

Do not enable production until the legal and provider-authorization blockers in
[`legal-risk-register.md`](./legal-risk-register.md) are resolved. In
particular, written permission for Vendo's customer-facing Higgsfield API use
is required; public SDKs do not grant resale permission.

For local UI review, use the commerce-workbench routes in
`docs/ui-inventory.md`. A seeded `seller@vendo.test` login is available only
with loopback MongoDB via `pnpm db:init --test-user=seller@vendo.test`; it is
not a production account or a sign-in bypass.

## Health at a glance

| Signal | Where | Healthy |
|---|---|---|
| Reconciler | Vercel → Cron → `/api/cron/reconcile` | 200 every minute; JSON summary with small numbers |
| In-flight runs | Admin → Generations → status `queued` / `in_progress` | Nothing older than `RUN_TIMEOUT_MINUTES` (30) |
| Pending submits | Admin → Generations → `pending_submit` | Empty after 2 minutes |
| Pricing | Admin → Models & pricing | No pink "placeholder" or "Reprice" badges |
| Billing flags | Admin → Users (pink ⚠ next to an email) | None unreviewed |
| Bachs webhook | Bachs dashboard → webhook deliveries | Recent 2xx responses; no recurring `400 invalid signature` |

## Generation lifecycle

`pending_submit → queued → in_progress → completed | failed | nsfw | canceled`

* Credits are debited in the same transaction that creates the generation.
* `failed`, `nsfw`, `canceled` and timeouts refund exactly once (ledger key
  `{reason, refType, refId, bucket}`); the reconciler re-runs any refund that
  didn't land.
* The webhook never trusts its payload — it re-fetches
  `GET /requests/{id}/status`.

## Arcjet request protection

`ARCJET_KEY` is required in production. `proxy.ts` applies IP-based fixed
windows: 10 `/api/auth/*` requests per 10 minutes, 120 API reads per minute,
and 60 API writes/server actions per minute. Webhooks, cron, and test hooks are
excluded and retain their own authentication/signature checks. MongoDB
per-user limits continue to apply on generation and upload paths. Locally,
Arcjet can be omitted; a single warning is logged and the Arcjet layer is
skipped. Denials return 429; Arcjet decision errors fail closed with 503.

### A run is stuck

1. Admin → Generations, filter by status. Note the platform request id.
2. The user can press **Check status** on the tile (after 90 s), or wait for
   the reconciler (runs every minute; anything untouched for 3 minutes is
   re-fetched).
3. After `RUN_TIMEOUT_MINUTES` the reconciler cancels (if queued) or fails the
   run and refunds. A late platform success is still delivered to the user
   (logged as "late delivery"), without re-charging.

### Ambiguous submits (`pending_submit` with no request id)

The platform has no idempotency key, so timeouts/502/504 on submit are never
retried automatically. After 2 minutes the reconciler marks them failed and
refunds. If a webhook for that generation arrives later, the result is attached
and delivered free.

### Platform errors in logs

| Log | Meaning | Action |
|---|---|---|
| `OPERATOR ALERT: Higgsfield rejected HF_CREDENTIALS (401)` | Key revoked/rotated | Update `HF_CREDENTIALS`, redeploy |
| `OPERATOR ALERT: Higgsfield account is out of credits (403)` | Platform balance empty | Top up the platform account |
| `OPERATOR ALERT: Platform concurrency limit reached` | Account concurrency cap | Ask Higgsfield for higher limits; lower plan concurrency |
| `[pricing] live cost … exceeds our price basis` | Price table stale | Admin → Models & pricing, or `pnpm pricing:sync` |
| `[bachs] webhook rejected: invalid signature` | Secret mismatch (wrong environment?) | Re-copy `BACHS_WEBHOOK_SECRET` from the endpoint's signing secret and redeploy |

## Pricing

* `pnpm pricing:sync` (needs `HF_CREDENTIALS`) rebuilds
  `lib/billing/pricing.generated.json` from `POST /estimate/{path}`: every
  endpoint the catalog reaches, every enum/switch value it offers there, and
  the duration curve. Commit and deploy. Endpoints that fetch their inputs
  need reachable sample media: `PROBE_IMAGE=https://… PROBE_VIDEO=https://…
  pnpm pricing:sync` (any public image and ~5 s MP4).
* Wan 3.0 returns a pricing *description*; the sync prints it. Its rules are
  hand-derived in `lib/billing/pricing-table.ts` (`source: "description"`,
  source text quoted next to the rules) — re-check them when the sync shows a
  changed description.
* **Unverified** (placeholder) prices are never sold against the live API:
  every rule marked `source: "placeholder"` in
  `lib/billing/pricing-table.ts` is unavailable until priced in Admin →
  Models & pricing → ✎.
* Per-endpoint overrides: Admin → Models & pricing → ✎. Takes effect within 30 s.
* The price guard blocks a submit only when the live cost is > 25 % above our
  basis (and flags the model at > 1 %).

## Bachs setup

| Variable | Meaning |
|---|---|
| `BACHS_API_URL` | `https://sandbox-api.bachs.io` (sandbox) or `https://api.bachs.io` (live) |
| `BACHS_SECRET_KEY` | `sk_sandbox_…` / `sk_live_…`. Unset → checkout is disabled with a clear message. Swapping sandbox→live is the go-live step. |
| `BACHS_WEBHOOK_SECRET` | The endpoint's signing secret (`whsec_…`) for `X-Bachs-Signature-V2` |
| `BACHS_PRICE_*` | Product ids: `STARTER_MONTHLY/ANNUAL`, `PLUS_MONTHLY/ANNUAL`, `ULTRA_MONTHLY/ANNUAL` (recurring) and `TOPUP_SMALL/MEDIUM/LARGE` (one-time). Create the 6 subscription + 3 top-up prices in the Bachs dashboard **in rands (ZAR)**, amounts matching `lib/billing/plans.ts`. |

* Webhook endpoint: `https://<domain>/api/webhooks/bachs`. Subscribe to
  `collection.succeeded`, `invoice.paid`,
  `customer.subscription.created|updated|deleted` and `refund.paid`. Money
  arrives as decimal strings (`"29.00"`), never minor units.
* Every mutating Bachs call carries an `Idempotency-Key`; the client retries
  429/5xx with backoff, so replayed deliveries are safe.
* **Deliveries are at-least-once and can arrive out of order.** All grants run
  through `lib/billing/bachs-events.ts`: events dedupe in `bachs_events`
  (document `_id` = Bachs event id), every grant or clawback re-fetches the
  checkout/subscription/invoice from the Bachs API first, and subscription
  transitions carry a `planStatusAt` ordering guard. Replaying any event from
  the dashboard changes nothing.
* Top-ups are granted **only** from `collection.succeeded` (state
  `SUCCEEDED`/`ACCEPTED`/`OVERPAID`); `invoice.paid` also fires for one-off
  charges and is ignore-buffered for them. Out-of-band balance deposits (no
  checkout id) never grant credits.
* Local testing without touching Bachs: `pnpm mock:bachs` (port 4011) serves a
  fake API + hosted checkout/portal and delivers the same signed webhooks to
  `BACHS_WEBHOOK_TARGET` (default `http://localhost:3000/api/webhooks/bachs`).

### Refunding a purchase

1. Find the charged checkout: grab the `chk_…` id from the user's ledger
   (`charge` entries, reason `bachs_sale` / `purchase`) or their Bachs
   customer in the dashboard.
2. Refund in the Bachs dashboard (full or partial) **and set `reference` to
   that `chk_…` checkout id** — this is the only field our clawback can map
   back to our ledger.
3. `refund.paid` triggers `refundCredits`: the user gets back
   floor(granted × refunded/requested) top-up credits (never below zero), with
   anything already spent handled as: the account is **flagged** for review and
   an admin decides (negative ledger entry vs. acceptance) in
   Admin → Users. Unmatched/missing references flag the account instead of
   guessing.
4. On the plan side, refunds do not pull subscription credits back
   automatically — adjust in Admin → Users if the policy is to claw the
   current period's charges.

## Credits and billing

* Adjust a balance: Admin → Users → **Adjust credits** (ledger `admin_adjust`
  with a note the user sees in their history).
* Bachs events are deduplicated (`bachs_events`) and every grant is keyed on a
  Bachs id. Replaying an event from the Bachs dashboard is safe.
* Refunded top-ups claw back credits (never below zero). If the credits were
  already spent the user is flagged — decide in Admin → Users, then clear the
  flag.
* Subscription invoices **reset** plan credits; cancellation keeps them until
  the period ends (`customer.subscription.deleted` zeroes the plan bucket
  once, ordered by `planStatusAt`).
* Annual plans get monthly grants from the reconciler (`nextGrantAt`).
* Current annual product totals are Starter **R1,908**, Plus **R5,268**, and
  Ultra **R13,428** (monthly equivalents R159 / R439 / R1,119). Bachs must use
  those exact annual totals before checkout is enabled.

## Moderation

Admin → Moderation lists reported public generations. **Unpublish** removes an
item from Community and blocks re-publishing; **Dismiss** closes the reports.

## Secrets rotation

| Secret | Rotation |
|---|---|
| `AUTH_SECRET` | Rotating signs everyone out (database sessions stay, cookies become invalid). |
| `HF_WEBHOOK_SECRET` | In-flight runs' webhook tokens stop verifying; the reconciler finishes them. |
| `HF_CREDENTIALS` | Create the new key in the console first, deploy, then revoke the old key. |
| `BACHS_WEBHOOK_SECRET` | Roll in the Bachs dashboard; Bachs retries failed deliveries, so deploy promptly to avoid skipped grants. |
| `BACHS_SECRET_KEY` | Create the new key (`sk_live_…`) first, deploy, then revoke the old key. |
| `CRON_SECRET` | Update in Vercel; Vercel Cron sends the new value automatically. |

## Data

* Indexes: `pnpm db:init` (idempotent). Required for the ledger's exactly-once
  guarantees — run it before the first deploy.
* Outputs live in R2 under `u/{userId}/{generationId}/{n}.{ext}`; uploads under
  `u/{userId}/uploads/`. Deleting a generation deletes its objects.
* Backups: enable Atlas continuous backup; R2 has no versioning by default.

## Launch checklist

- [ ] Every `(required)` variable in `.env.example` set in Production.
- [ ] Written Higgsfield authorization explicitly covers Vendo's paid,
      customer-facing SaaS use; set `HF_SAAS_APPROVAL_REFERENCE` to its actual
      reference. Without it production fails environment validation and live
      API calls are blocked.
- [ ] `ARCJET_KEY` set and Arcjet decisions verified in the production project.
- [ ] `pnpm db:init` against the production database.
- [ ] `pnpm pricing:sync` with the live key; no placeholder prices in admin.
- [ ] Final plan prices and credit allowances in `lib/billing/plans.ts`; 6
      subscription + 3 top-up prices created in Bachs matching those amounts,
      `prod_…` ids in the `BACHS_PRICE_*` variables.
- [ ] Bachs live key swapped in (`BACHS_API_URL=https://api.bachs.io`,
      `sk_live_…`), webhook endpoint + events configured
      (`/api/webhooks/bachs`), signing secret deployed, test purchase paid and
      refunded with `reference` set to the `chk_…` id (verify the ledger
      grant and clawback both fire once).
- [ ] Resend domain verified; a real magic link arrives.
- [ ] R2 CORS allows GET from the site origin.
- [ ] South African counsel approves the legal pages and closes the
      operator-identity, POPIA, CPA/ECTA, data-retention, provider-rights, and
      community-publication items in `legal-risk-register.md`.
- [ ] License/permission for adapted `higgsfield-ai/app-templates` code is
      resolved or affected code is replaced; all public media and dependency
      licenses are inventoried.
- [ ] `pnpm test:e2e` green against the preview deploy (`E2E_TEST_MODE` on the preview only).
