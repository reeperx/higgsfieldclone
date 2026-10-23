# Vendo — contract for coding agents

Vendo is a credit-metered **e-commerce product photo & video** studio using
[Bachs](https://docs.bachs.io). Live Higgsfield API use is gated on written
SaaS authorization. Read `README.md`, `docs/decisions.md` and
`docs/model-catalog.md` before changing behaviour.

## Layout

- `app/(site)` marketing pages (expanded nav + footer) · `app/(studio)` full-height
  workspaces (generators, library) · `app/(app)` scrolling signed-in pages
  (dashboard, account, billing, admin) · `app/api` route handlers · `app/actions` server actions.
- `generation/catalog/models/*.ts` — one file per model family, pruned to the
  product-work keep-list; the barrel is generated (`pnpm models` — force with a
  delete of `models.generated.ts`; the sync only watches the file list). Never
  hand-edit `models.generated.ts`.
- `lib/higgsfield` (server-only platform client with SaaS authorization gate),
  `lib/generations` (submit,
  finalize, reconcile, cancel, library), `lib/billing` (price, ledger,
  Bachs:   `bachs.ts`, `bachs-events.ts`, `checkout.ts`), `lib/db` (MongoDB with Zod
  validation at critical write boundaries), `lib/storage`
  (R2 / local), `lib/uploads.ts`, `auth.ts`.
- `components/generator` (panel, dock, canvas, picker), `components/studio`
  (template primitives: prompt box, gallery, lightbox, asset library),
  `components/site`, `components/billing`, `components/library`, `components/admin`.
- Offline dev comes from two mocks: `scripts/mock-higgsfield.ts` (:4010) and
  `scripts/mock-bachs.ts` (:4011, fake hosted checkout/portal + signed webhooks).

## Invariants — preserve these

- **Server only:** the platform key, Bachs/Resend/R2 secrets and model paths.
  `lib/higgsfield/**` imports `server-only`. Request paths and bodies come from
  the catalog (`toPlatform`), never from the client.
- **Higgsfield authorization:** keep `HF_SAAS_APPROVAL_REFERENCE` unset unless
  actual written permission covers Vendo's paid customer-facing SaaS use. Do
  not treat open-source SDKs or public repositories as API resale permission.
- **Arcjet:** `ARCJET_KEY` is required in production; local development may
  omit it. Keep the IP limits in `proxy.ts` in addition to per-user MongoDB
  limits.
- **Every server action / route handler** calls `auth()` (via `requireUser`)
  and scopes queries by `userId`; other users' ids are 404, not 403.
- **Credits change only through `lib/billing/ledger.ts`**, inside transactions,
  never below zero, idempotent on `{reason, refType, refId, bucket}`.
- **Bachs webhooks grant once:** deliveries are at-least-once and may arrive
  out of order — events dedupe in `bachs_events`, anything that grants or cuts
  credits is re-fetched from the Bachs API first, and subscription writes carry
  a `planStatusAt` ordering guard. Top-ups grant only from
  `collection.succeeded` (invoice.paid also fires for one-off charges).
- **Bachs money is a decimal string** ("29.00"); never divide by 100.
- **Prices come from `priceFor`/`quoteRequest`** on the server; the client's
  number is display only.
- **Finalize is the only path to a terminal status**; it re-fetches the status
  (webhook payloads are untrusted) and refunds failed/nsfw/canceled once.
- **Poll our DB, not the platform:** the browser polls
  `GET /api/generations/status`; never poll through a server action.
- **Model files cite their docs URLs**; never invent endpoints, fields or enums.
- Generating and failed tiles stay in feeds; loaded media never unmounts on fast scroll.
- The Vendo product UI is dark-only: forest/ink surfaces (`#101711`,
  `#171F18`, `#202B22`), forest actions (`#31583E`) and sand (`#D8B26E`)
  only for Generate and active states. Use Space Grotesk display type and
  sentence case. Keep model names subordinate to commerce tasks. See
  `docs/ui-inventory.md`.
- Every visible control works (remove what can't); no `any`, `@ts-ignore`, or
  `@ts-expect-error`.
- **Customer money is rand (ZAR):** plan/top-up amounts live in
  `lib/billing/plans.ts` and render through `lib/billing/money.ts` → `zar()`;
  Bachs products must be created in rands. The internal platform-cost basis
  stays USD (Higgsfield bills USD) — admin pricing views quote USD on purpose.
- **Legal pages** (`/legal/terms|privacy|refunds|cookies|acceptable-use`) are
  placeholders pending lawyer review; adding a policy means keeping its tabs
  and footer links in sync with `components/site/footer.tsx`. Do not present
  draft claims as legal advice or launch before the blockers in
  `docs/legal-risk-register.md` are resolved.

## Definition of done for a change

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass; E2E
(`pnpm test:e2e`) passes against a running stack; docs updated when a default
or contract changes.
