# Vendo — AI product photo & video studio

Vendo is a production-grade studio for **e-commerce product photography and
video** on the [Higgsfield REST API](https://docs.higgsfield.ai). The catalog is
pruned to the models that matter for product work — studio packshots, AI-model
lifestyle scenes, product video and re-composites — **17 picker entries covering
the endpoints they use**. Sellers sign in with a magic link, pay with Bachs
credits priced in **South African rand (ZAR)**, and keep everything in a
personal library. The interface is an editorial product workbench: warm paper surfaces, ink
typography, terracotta actions, and product-first workflows. Generation tools
sit inside that commerce-specific experience instead of leading with a model
directory.

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| UI | Tailwind v4 + shadcn (Base UI), Quanta tokens, lucide, zustand, @tanstack/react-virtual — scaffolded from [`higgsfield-ai/app-templates`](https://github.com/higgsfield-ai/app-templates) |
| Auth | Auth.js v5 (`next-auth@5`), magic links via Resend, database sessions |
| Email | Resend + React Email (`emails/`) |
| Database | MongoDB (Atlas replica set) — one client shared by the Auth.js adapter and the app |
| Payments | Bachs Checkout, subscriptions, customer portal, webhooks ([docs.bachs.io](https://docs.bachs.io)) |
| Generation | Higgsfield REST API, one server-side key |
| Media | Cloudflare R2 (every output is copied; the platform keeps outputs ≥ 7 days) |

## Quick start (fully offline)

Nothing external is needed to run the whole product locally: a local MongoDB
replica set, a mock Higgsfield API, a mock Bachs API and a dev mailbox stand in
for the services.

```bash
pnpm install
cp .env.example .env.local      # then fill AUTH_SECRET: openssl rand -base64 32
```

In four terminals:

```bash
pnpm db:dev            # MongoDB replica set on :27027 (data in .data/mongo)
pnpm mock:higgsfield   # mock platform on :4010 ("[fail]", "[nsfw]", "[slow]" in a prompt steer outcomes)
pnpm mock:bachs        # mock billing on :4011 (hosted checkout/portal pages, signed webhooks)
pnpm dev               # http://localhost:3000
```

Once, after the database is up:

```bash
pnpm db:init --admin=you@example.com   # indexes + shot presets (+ admin role)
pnpm db:init --test-user=seller@vendo.test
```

For offline development set in `.env.local`:
`MONGODB_URI=mongodb://127.0.0.1:27027/?replicaSet=vireo`,
`HF_API_BASE_URL=http://localhost:4010`, `HF_CREDENTIALS=mock:mock`,
`BACHS_API_URL=http://localhost:4011`, `BACHS_SECRET_KEY=sk_sandbox_mock`,
`SIGNUP_BONUS_CREDITS=200`, `E2E_TEST_MODE=true`. Magic links are printed to the
dev-server log for ordinary local addresses; reserved `.test` addresses are
captured in the local mailbox described below (no Resend key needed). Media is
stored under `.data/media`; the reconciler runs in-process every 5 s because
there is no cron or webhook tunnel.

### Sign in as the local test seller

The `--test-user` option creates or reuses `seller@vendo.test` on a loopback
MongoDB only, with the configured welcome-credit bonus. It is an ordinary
passwordless user, not an admin or an authentication bypass. Set
`E2E_TEST_MODE=true` as in the offline configuration, enter that address at
`/login`, then open the latest local magic link from
`http://localhost:3000/api/test/mailbox?to=seller%40vendo.test`. The mailbox is
disabled in production; no production account or real email is created.

## Interface and route map

Vendo presents commerce tasks first: build a listing set, place a product in a
lifestyle scene, create a short product film, then organize and publish those
assets. The shared public and account shell uses a paper-and-ink palette;
generation canvases can use a contained dark work area. Route intent, page
design, and interaction rules are documented in [`docs/ui-inventory.md`](docs/ui-inventory.md).

### Offline checkout

`pnpm mock:bachs` serves the endpoints our client uses plus fake hosted
checkout and customer-portal pages. Opening a checkout from the pricing page
redirects to `http://localhost:4011/checkout/<id>`; **Pay now** marks the
session paid and delivers the same webhooks the real platform sends
(`collection.succeeded`, `customer.subscription.*`, `invoice.paid`), signed
with `BACHS_WEBHOOK_SECRET`. The portal page can cancel/resume the
subscription, which drives `customer.subscription.updated/deleted` end to end.
Product prices are inferred from the `BACHS_PRICE_*` ids in `.env.local`.

## Real services

| Service | What to set | Notes |
|---|---|---|
| MongoDB Atlas | `MONGODB_URI`, `MONGODB_DB` | Any replica set (Atlas M0 works). Run `pnpm db:init` against it. |
| Resend | `AUTH_RESEND_KEY`, `EMAIL_FROM` | Verify the sending domain first. |
| Higgsfield | `HF_API_BASE_URL=https://api.higgsfield.ai`, `HF_CREDENTIALS=key_id:key_secret` | Keys from [console.higgsfield.ai](https://console.higgsfield.ai). Then run `pnpm pricing:sync`. |
| Webhooks | `HF_WEBHOOK_SECRET`, `HF_WEBHOOK_BASE_URL` | Public HTTPS origin. Locally: `cloudflared tunnel --url http://localhost:3000` and put the URL here. |
| Bachs | `BACHS_API_URL`, `BACHS_SECRET_KEY`, `BACHS_WEBHOOK_SECRET`, `BACHS_PRICE_*` | Create 6 recurring products (3 plans × month/year) and 3 one-time top-up products in the Bachs dashboard **in rands (ZAR)**, amounts matching `lib/billing/plans.ts`, then put their `prod_…` ids in the env. Sandbox: `https://sandbox-api.bachs.io` + `sk_sandbox_…`; production: `https://api.bachs.io` + `sk_live_…` (a key swap). |
| R2 | `R2_*` | Public bucket or custom domain for `R2_PUBLIC_BASE_URL`; CORS: allow GET from your origin. |

Local Bachs webhooks without the mock: `bachs listen --forward-to
localhost:3000/api/webhooks/bachs` (amounts are decimal strings like
`"29.00"`, never minor units).

### Pricing

`credits = ceil(platform USD × CREDIT_MARKUP / CREDIT_USD_VALUE)`. Prices
come from the platform's estimate endpoint:

```bash
pnpm pricing:sync            # calls POST /estimate/{path} for every endpoint
```

It writes `lib/billing/pricing.generated.json` (commit it). Token-metered
models (Seedance, Cinema Studio, Wan 3.0, …) return a pricing description
instead; their rules are derived from it in `lib/billing/pricing-table.ts`.
Endpoints with no verified price are not sold on the live API until an admin
sets one in **Admin → Models & pricing**, and a price guard compares each
submit against the live estimate (`HF_PRICE_GUARD`). Details:
`docs/runbook.md` → Pricing.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (regenerates the model barrel on change) |
| `pnpm build` | Production build + client-bundle secret scan |
| `pnpm typecheck` / `pnpm lint` | `tsc --noEmit` / ESLint |
| `pnpm test` | Vitest: catalog snapshots (every model), pricing, ledger, lifecycle, webhooks (in-memory MongoDB replica set) |
| `pnpm test:e2e` | Playwright against a running stack (`E2E_BASE_URL` for a preview deploy) |
| `pnpm models` | Regenerate `generation/catalog/models.generated.ts` |
| `pnpm db:dev` / `pnpm db:init` | Local MongoDB / indexes + preset seed |
| `pnpm mock:higgsfield` | Local mock of the Higgsfield REST API |
| `pnpm mock:bachs` | Local mock of the Bachs billing API + webhook deliveries |
| `pnpm pricing:sync` | Derive prices from the estimate endpoint |

## Adding a model

1. Add `generation/catalog/models/<family>.ts` with a default export of
   `ModelEntry[]` (copy a neighbour). Map UI settings to the **documented**
   body fields in `toPlatform`, and cite the docs URLs in the header comment.
2. `pnpm models` (force with: delete `models.generated.ts` first — the sync
   only watches the file list, not contents).
3. Add a price rule for each new endpoint path in `lib/billing/pricing-table.ts`
   (or run `pnpm pricing:sync`).
4. `pnpm test -u` updates the catalog snapshots; review them against the docs.

Adding the first **audio** model makes the Audio nav item and `/audio` appear
automatically — the surface, tiles, player and pricing are already wired.

## Architecture

```
Browser ── prompt dock / panel ─▶ server action submitGeneration()
   │                                 validate vs catalog → price → debit (Mongo txn)
   │                                 → POST {model path}?hf_webhook=… → store request_id
   ├─ PUT file ─▶ presigned platform upload URL (key never leaves the server)
   └─ polls GET /api/generations/status (our DB only) every 3.5 s while in flight
Higgsfield ── webhook ─▶ /api/webhooks/higgsfield (HMAC token) ─▶ finalizeGeneration()
Vercel Cron ─▶ /api/cron/reconcile ─▶ stuck/ambiguous runs, refunds, copy retries, annual grants
finalizeGeneration(): re-fetch status → copy outputs to R2 → complete, or refund failed/nsfw/canceled once
Bachs ── webhook ─▶ /api/webhooks/bachs (X-Bachs-Signature-V2) ─▶ ledger grants (idempotent on Bachs ids)
```

Key files: `lib/generations/{submit,finalize,reconcile,cancel}.ts`,
`lib/billing/{price,ledger,bachs,bachs-events,checkout}.ts`,
`lib/higgsfield/client.ts`, `generation/catalog/**`,
`components/generator/**`, `auth.ts`.

## Deployment (Vercel)

1. Create the Atlas cluster, R2 bucket, Resend domain and Bachs products.
2. Set every `(required)` variable from `.env.example` in Vercel (Production + Preview).
3. `vercel.json` schedules `/api/cron/reconcile` every minute (send `CRON_SECRET`).
4. Bachs webhook endpoint: `https://<domain>/api/webhooks/bachs` with events
   `collection.succeeded`, `invoice.paid`, `customer.subscription.created/updated/deleted`,
   `refund.paid`. Copy the signing secret into `BACHS_WEBHOOK_SECRET`.
5. `pnpm db:init` against production once; `pnpm pricing:sync` with the live key.

See `docs/runbook.md` for operations, `docs/decisions.md` for every default and
docs-vs-template disagreement, and `docs/model-catalog.md` for the model table.

The Studio UI is adapted from `higgsfield-ai/app-templates` (no LICENSE file
as of 2026-09-26 — re-check before launch; see `docs/decisions.md`).
