# Decisions

Every default the brief left to us, and every place the sources disagree.
Newest decisions go at the bottom of each section.

## Brand values (brief placeholders)

| Placeholder | Value | Why |
|---|---|---|
| `BRAND_NAME` | **Vendo** | Renamed 2026-10 when the product was re-scoped to e-commerce product photos & videos: a selling word (vendo = "I sell"), short and ownable. The October 2026 UI redesign establishes a paper/ink palette with terracotta and mineral-blue accents. |
| `APP_SLUG` | `vendo-studio` | |
| `PRODUCTION_URL` | `https://vendo.studio` | Placeholder domain; change in env (`APP_URL`, `AUTH_URL`). |
| `EMAIL_FROM` | `Vendo <login@vendo.studio>` | Domain must be verified in Resend before launch. |
| `SUPPORT_EMAIL` | `support@vendo.studio` | |
| `CREDIT_MARKUP` | `2.0` | Sell at 2× the Higgsfield API cost; with `CREDIT_USD_VALUE=0.01` a $0.094 image costs 19 credits. |

## Sources and precedence

1. **Live docs win for API behavior, template wins for UI** (brief §0.3). Model
   files are written from the docs' per-workflow JSON schemas; the template's
   generic `imageModel()` / `videoModel()` defaults are *not* used for any
   model whose documented schema differs from them (all of them, in practice).
2. **Console price list unavailable** (needs the owner's login). We use the
   documented estimate endpoint instead — see Pricing.
3. **`/models` on the API** answers 401 without credentials but is undocumented,
   so we don't depend on it.
4. **CLI `MODELS.md` names are job-set types**, not REST paths (brief §1a). It
   was not used as a source for any REST path.
5. **License:** `higgsfield-ai/app-templates` has no LICENSE file as of
   2026-09-26 (commit `b29cdab`). Higgsfield publishes it as a public shadcn
   registry for scaffolding apps on its API, which is our use. Template
   attribution comments are kept. **Re-check for a LICENSE before launch.**

## Docs vs template (docs win)

| Area | Template | Docs | Resolution |
|---|---|---|---|
| API host | `HF_API_BASE_URL=https://platform.higgsfield.ai` | `https://api.higgsfield.ai` everywhere | Default `https://api.higgsfield.ai`; env-overridable. |
| Flux 2, Flux 3, DoP | model files present | absent from the 82-entry catalog | Listed as **Unverified**, not in the picker. |
| Seedance 2.0 Fast / Mini | `bytedance/seedance-2.0/{fast,mini}` | only base 2.0 workflows | **Unverified**. |
| Seedance 2.5 Edit/Extend video refs | `video: 10` | source video counts toward the 10-video cap → ≤9 extra | `video: 9`; total media ≤ 50 enforced. |
| Grok Imagine Video 1.5 | `{ reference: 8, video: 3 }` via generic mapper | `image_url` **or** `image_urls` ≤7 + `audio_url` ≤1; no `video_urls`; 1080p only without refs | Custom mapper per docs. |
| Wan 2.6 | generic: `aspect_ratio` + duration 4–10 | t2v/i2v have no `aspect_ratio`; duration ∈ {5,10,15}; r2v takes 1–3 **videos** | Custom mapper; three modes. |
| Hailuo 2.3 | generic: sends `aspect_ratio`, `resolution` | neither field exists; duration ∈ {6,10}; `prompt_optimizer` | Custom mapper. |
| Kling 2.5 Turbo | standard i2v only | + Pro t2v and Pro i2v; `cfg_scale`, `negative_prompt`; duration ∈ {5,10} | Two entries (Pro, Standard). |
| Kling 2.6 | duration range 4–10, no sound | duration ∈ {5,10}; `sound` on/off; `cfg_scale` | Custom mapper. |
| Kling 2.6 Motion Control | missing | `kling-video/motion-control/{std,pro}` | Added. |
| Kling O3 / Omni | first-last-frame only | + image-reference, video-edit, video-reference; O3 `mode` std/pro/4k, `sound` default off | Added all workflows. |
| Kling Motion Control | image + video optional | both **required** | `requiredRoles: ["start","source"]` (motion video is the `source` slot, labelled “Motion video”). |
| LTX-2.5 | `t2v()` helper cannot derive the i2v path (path ends in `/fast`) | `…/image-to-video/{fast,pro}` with `end_image_url`; duration ∈ {6,8,10}; fps | Custom mapper with i2v. |
| MiniMax H3, Happy Horse, Wan 2.7, Wan 3.0, PixVerse | text + generic image path only | reference-to-video workflows, end frames, model-specific ranges | Custom mappers per docs. |
| Cinema Studio 4.0, Genjutsu, Marketing Studio Image, Soul (v1) | missing | documented | Added. |
| Seedance 2.5 text-to-video page | — | one page of 81 was not re-read after a tool-permission denial; the endpoint is confirmed by the family page's workflow table and the template mapper | Uses the template mapper (`aspect_ratio`, `duration`, `resolution`, `generate_audio`, `bitrate_mode`), the same fields the sibling i2v/r2v pages document. Re-verify when convenient. |

## Architecture

- **Template scaffold, not a rewrite.** UI components, Quanta tokens, catalog
  contract, polling lessons and upload contract come from the template.
- **Server client:** keep the template's thin `fetch` client
  (`generation/platform.ts`) moved to `lib/higgsfield/client.ts` with
  `server-only`, retries (429/5xx with exponential backoff + full jitter, max 3,
  8 s deadline) for **status/cancel/estimate/upload** only. Submits are **not**
  auto-retried after an ambiguous failure because the docs say submissions do
  not accept an idempotency key; ambiguous submits stay `pending_submit` for the
  reconciler. (Chosen over `@higgsfield/client` v2: fewer moving parts, and the
  template's client already matches the documented contract.)
- **Double-submit guard:** the generation document is created (and credits
  debited) in one transaction *before* the platform call, with a unique
  `submitKey` (client-generated UUID per Generate press). A second press with
  the same key hits the unique index and returns the existing generation.
- **Webhook auth:** docs describe no signature. URL carries
  `gid` + `t = HMAC-SHA256(gid, HF_WEBHOOK_SECRET)` (constant-time compare);
  the payload is never trusted — we re-fetch `GET /requests/{id}/status`.
- **Polling:** the browser polls our `GET /api/generations/status?ids=` (DB
  only) every 3.5 s while anything is in flight — never a server action.
- **Media storage:** Cloudflare R2 via `@aws-sdk/client-s3` + `lib-storage`
  streaming upload. Local dev without R2 credentials falls back to a
  filesystem driver under `.data/media` served by `/api/media/[...key]`
  (development only; production boot fails without R2 env).
- **Email in dev:** without `AUTH_RESEND_KEY` in development, magic links are
  printed to the server log. Production boot fails without it.
- **Env validation:** `lib/env.ts` (zod) validates at boot; production requires
  every service key, development allows the documented fallbacks and prints
  one warning line per fallback.

## Auth

- Auth.js v5, Resend provider (magic link only), MongoDB adapter, database
  sessions, session exposes `user.id` + `user.role` only.
- Rate limits (Mongo TTL collection `rate_limits`): 5 magic-link sends / email /
  hour, 20 / IP / hour; disposable-domain blocklist on (small static list,
  config flag `BLOCK_DISPOSABLE_EMAIL`).
- Signed-out users can browse and open generators; Generate/Upload opens the
  auth modal and the dock state is preserved in localStorage (it already is).

## Credits and pricing

- `credits = ceil(hfUsd × CREDIT_MARKUP / CREDIT_USD_VALUE)`, min 1.
- `priceFor(modelId, settings, media)` is pure, shared by UI and server, unit
  tested. Rules per model: `per_image` (× batch), `per_second` (× duration,
  optional per-resolution multipliers), `flat`, and `per_second_of_source`
  (edit/motion endpoints whose duration follows the source video; billed on a
  declared max — see below).
- **Source-duration models** (Seedance Edit, Kling Motion Control, Genjutsu,
  Kling O3/Omni edit): output length follows the uploaded video, which we can't
  measure before submit without ffprobe. v1 charges for the documented
  **maximum** (e.g. 30 s) up front and **refunds the difference** at finalize
  when the platform reports a shorter output (duration probed from the MP4
  `mvhd` box). Recorded as a `generation_refund` partial with `refType:
  "generation-adjust"`.
- **Three price sources** (`PriceRule.source`): `estimate` (synced from
  `POST /estimate`), `description` (hand-derived from the pricing text that
  token-metered endpoints return instead of numbers — e.g. Seedance 2.5 at
  $0.0214 per 1,000 video tokens, i.e. $0.4622/s at 720p 16:9) and
  `placeholder` (unverified; priced for the local mock only and **not sold on
  the live API** until an admin sets a price). Token-metered models also bill
  input videos: `inputVideo` adds their seconds and applies the 0.6× with-video
  rate; unknown input lengths count as the rule's maximum. MiniMax H3's extra
  reference images use `perItem`.
- **Estimate guard:** before submitting, the server calls
  `POST /estimate/{path}` with the exact body (1.5 s timeout). If the live USD
  would make our price a loss (`liveUsd > credits × CREDIT_USD_VALUE`), the
  submit is refused with "This setting is being repriced — try again shortly"
  and the model is flagged in admin. If the estimate call fails, the submit
  proceeds on the table price (fail-open, logged).
- **Buckets:** `subscription` credits are **reset** on each paid subscription
  invoice; `topup` credits never expire. Spend subscription first. Both are
  flags in `lib/billing/config.ts` (`SUBSCRIPTION_RESETS=true`,
  `SPEND_ORDER=["subscription","topup"]`).
- `SIGNUP_BONUS_CREDITS` default **0** in `.env.example` per the brief; our
  suggested launch value is 50 (enough for ~2 images to try the product).

## Plans (suggested ZAR prices)

Vendo offers Free / Starter / Plus / Ultra plans with monthly and annual
billing, plus three top-up packs. The suggested rand amounts, credit
allowances, and concurrency limits live in `lib/billing/plans.ts`; final
amounts still need owner confirmation. Each plan product id comes from env
(`BACHS_PRICE_*`), and matching products must be configured in Bachs in ZAR.

## Payments — Bachs (replaced Stripe, 2026-10)

The payment platform is [Bachs](https://docs.bachs.io) (source of truth:
`https://docs.bachs.io/llms.txt`). Stripe was removed fully — dependency,
`lib/billing/stripe*`, the webhook route, CSP entries; the secret-scan now
watches `sk_(sandbox|live)_…` against `sk-test_…`-style Stripe keys. What the
integration relies on:

- **API base:** sandbox `https://sandbox-api.bachs.io` + `sk_sandbox_…`; going
  live is `https://api.bachs.io` with a `sk_live_…` key swap.
- **Money is a decimal string** (`"29.00"`). Never divide by 100; convert with
  `Number()` at the ledger boundary only.
- **Idempotency:** every mutating call (`POST`/`PATCH`) sends an
  `Idempotency-Key` header; safe methods are retried (429/500/502/503/504,
  backoff with full jitter, `SAFE_RETRY` in `lib/billing/bachs.ts`).
- **Webhooks are at-least-once and may arrive out of order.**
  `/api/webhooks/bachs` verifies `X-Bachs-Signature-V2: t=<ts>,v1=<hex>` —
  HMAC-SHA256 over `${t}.${rawBody}`, matched against any listed `v1`
  (constant-time) with a 300 s timestamp tolerance — and still treats payloads
  as untrusted: anything that grants or cuts credits re-fetches the object from
  the Bachs API first. Legacy `X-Bachs-Timestamp` + `X-Bachs-Signature` pairs
  are accepted for older configurations. Events dedupe in `bachs_events`
  (document `_id`), subscription writes carry a `planStatusAt` ordering guard.
- **Events:** `collection.succeeded` grants top-ups (checkout metadata carries
  `{user_id, credits}`); `invoice.paid` also fires for one-off charges, so it
  is gated on `data.subscription` being non-null and resolves the subscription
  from the API, re-fetching period end (fallback now + 30 d).
  `customer.subscription.created/updated/deleted` maintain
  `bachsSubscriptionId` + plan status; `cancel_at_period_end` shows as
  "canceling" and cancellation zeroes the plan bucket at period end.
  `refund.paid` claws back top-up credits floor(granted × refunded/requested)
  and flags the account when they are unavailable or already spent.
- **Checkout:** lazy customer creation (`POST /v1/customers` with the email,
  memo `{user_id}`), one reusable `billingPortal` session. `success`/`cancel`
  URLs are only sent when `APP_URL` is public HTTPS — Bachs rejects localhost
  in hosted checkout, so local dev returns to the app between steps without
  URL parameters and grants happen via webhooks only.
- **Top-up metadata holds the credit grant** (`credits` as a decimal string);
  a purchased checkout that never delivered its webhook can be replayed from
  the Bachs dashboard because `collection.succeeded` is keyed on the checkout
  id.
- **Refund mapping:** the clawback resolves our checkout only from the
  `reference` field on the refund. When refunding a top-up charge, set
  `reference` to the `chk_…` checkout session id; a null/unmatched reference
  flags the account instead of silently skipping.

## Catalog scope (pruned to product work, 2026-10)

The picker was re-scoped from "every documented model" (81 endpoints) to the
17-entry e-commerce keep-list in `docs/model-catalog.md`. Rationale: faster
picker review, fewer placeholder-priced units to vet, and every remaining entry
maps to a concrete product job (packshot, model-in-scene, product video,
re-composite). Pruned families (Kling O3/Omni/motion/legacy tiers, Wan
2.6/2.7/Prime, Happy Horse, Hailuo, LTX Pro, Recraft, Z-Image Turbo, Marketing
Image 2.0, Seedance edit/extend) stay documented there — restoring one is one
file + `pnpm models` + a price rule. Internal `vireo:*` identifiers
(localStorage keys, dev replica-set name, test fixtures) are deliberately not
renamed.

## UI

- Paper-and-ink workbench shell, with terracotta actions and mineral-blue
  secondary accents; the generation canvas may use a contained dark surface.
- Top navigation added (the template's "no app header" rule is overridden by
  the brief: the site's layout is the source of truth for page structure).
- The template's projects-first sidebar moves into `/assets` (Projects rail);
  generator pages use the site's left control panel + right canvas.
- **Audio nav item hidden** while the catalog has no audio models (see
  `model-catalog.md`); appears automatically when one is added.

## Theme — commerce workbench (2026-10)

Vendo's product UI uses warm paper (`#F4F0E8`), white paper (`#FFFDF8`), ink
(`#25231F`), terracotta (`#B94C32`), and mineral blue (`#476B82`). Editorial
serif display type, sentence-case labels, and product workflows distinguish the
experience from a generic model directory. Public, account, and library pages
use the light theme; a contained dark generation canvas may use the lighter
terracotta variant (`#E58B70`) for contrast.

Token overrides in `styles/theme.css` re-map Quanta's semantic roles; the
vendored `styles/quanta/**` source remains untouched. The published design
tokens live in `docs/design-tokens.json`, and route-level behavior is recorded
in `docs/ui-inventory.md`.

## Currency — rand (2026-10)

- **Customer-facing money is ZAR**: plans (Starter R199 / Plus R549 /
  Ultra R1 399 per month, annual −20 %; top-ups R99 / R399 / R899) in
  `lib/billing/plans.ts`, formatted by `zar()` in `lib/billing/money.ts`
  (`en-ZA`, decimal comma). Bachs products in the dashboard must be created in
  rands with matching amounts; `billing_currency: "ZAR"` flows through checkout.
- **The platform-cost basis stays USD.** Higgsfield bills us in dollars, so
  admin pricing views and the pricing-table documentation quote USD — that is
  cost data, not what customers pay.
- Mock Bachs serves rand products with matching annual amounts.

## Policies (2026-10)

Five legal documents live in `app/(site)/legal/[doc]/page.tsx` — terms,
privacy, **refunds**, **cookies** and acceptable-use — framed for South African
law (POPIA for privacy; the CPA cooling-off and s55 defect rights inform the
refund policy). They are honest placeholders describing actual product
behavior (automatic refunds for failed/canceled generations, claw-back on
purchase refunds) but must be lawyer-reviewed before launch; the placeholder
banner stays. Footer + cookie-consent link to all of them.

## Logo (2026-10)

The wordmark + product mark uses a terracotta tile with a product-label glyph,
inverted (ink tile, paper glyph) on terracotta surfaces (`LogoMark inverted`).
Set in components (`components/site/logo.tsx`) as UI and as `app/icon.svg` /
`public/icon.svg` for favicon. The wordmark renders lowercase Space Grotesk
instead of the uppercase display face.

## Implementation decisions (build)

- **Scaffold:** the shadcn init command was blocked by the tool sandbox, so the
  project was created by copying the cloned template (`b29cdab`) — same files,
  owner-approved.
- **Ledger idempotency key** is `{reason, refType, refId, bucket}` (the brief's
  key plus `bucket`), because one charge can split across the subscription and
  top-up buckets. Refunds return credits to the buckets that paid, top-up first.
- **Signup bonus** goes to the top-up bucket (never expires).
- **Session** exposes `user.id` and `user.role` only; balances are read live
  (`/api/me`, layout). Admins come from `role: "admin"` or `ADMIN_EMAILS`.
- **Submit retries:** only 429/500/503 (answers that prove nothing was created).
  Network errors, timeouts, 502 and 504 are ambiguous → `pending_submit` → the
  reconciler refunds after 2 min; a late webhook still delivers the result.
  400 "concurrency" from the platform is treated as a definite failure + refund.
- **Run timeout** is 30 minutes (`RUN_TIMEOUT_MINUTES`), not the brief's 15:
  30-second Seedance/Wan renders can legitimately exceed 15 minutes, and a
  premature refund would give away paid platform work.
- **Webhook route** replies immediately and finalizes in `after()`; a bad
  token is a 401 (the platform doesn't retry 4xx); a malformed envelope is 400.
- **Source-length pricing:** uploads and outputs are probed server-side
  (MP4 `mvhd`, WAV header), so edit/motion endpoints are priced from the real
  source duration. When unknown, the maximum is charged and the difference is
  refunded at finalize (`generation_adjust`).
- **Price guard:** flags a model at > 1 % drift from the live estimate and
  refuses the submit at > 25 % (break-even stays positive at the cheapest
  effective credit price ≈ $0.007 with a 2× markup). Fails open when the
  estimate call errors.
- **Uploads** use the platform's presigned URL (per the brief), are recorded
  with an HMAC-signed ticket (so the server only fetches URLs the platform
  issued — no SSRF), size-capped per kind (image 20 MB, video 200 MB, audio
  50 MB), and copied to R2 because platform uploads are tagged temporary.
- **Media ownership:** every attachment URL must belong to the caller (their
  upload or their own output); the server swaps in the fetchable URL.
- **Image generator layout** follows the live site (bottom-docked prompt bar,
  the template's `StudioPromptBox`); video/audio use the 320 px left panel.
  The brief described one layout; the site's structure wins.
- **Generate stays available while runs are in flight** (parallel generations
  up to the plan limit); Cancel lives on the queued tile's hover rail.
- **Audio surface** is complete but hidden (nav + `/audio` 404) until an audio
  model exists — the REST API documents none.
- **Local development** runs with no external service: `pnpm db:dev` (MongoDB
  replica set via mongodb-memory-server binaries), `pnpm mock:higgsfield`
  (documented request shapes), dev mailbox for magic links, local media
  storage, in-process reconciler (`instrumentation.ts`).
- **CSP** allows HTTPS in `connect-src` because presigned upload hosts aren't
  pinned by the docs; narrow it with `CSP_CONNECT_SRC` once known.
- **Plan prices** in `lib/billing/plans.ts` are suggested defaults
  (Starter R199 / Plus R549 / Ultra R1,399 monthly, 20 % off annual; 1,000 /
  3,500 / 9,000 credits; top-ups 500 / 2,200 / 6,000 credits for R99 / R399 /
  R899) — **owner to confirm** before launch.
- **Marketing media** (hero, auth carousel, model covers, preset covers, loops)
  was generated with Soul 2 and Kling 3.0 through the owner's Higgsfield
  account (≈ 56 platform credits), because the app itself needs a platform key
  to generate. Files live in `public/media`.
- **Catalog notes from implementation:** Kling O3/Omni image-reference cap of 7
  images is our choice (the docs set no maximum); Kling Omni duration offers
  5/10 s so both workflows accept it; Happy Horse offers 3–15 s and Wan 2.6
  720p/1080p so every workflow accepts the chosen value; Kling and MiniMax H3
  prompt limits (2,500 / 7,000) are enforced as hard limits although the docs
  say longer prompts are truncated; Ideogram `image_weight` defaults to 50.
- **Webhook signatures:** the JS SDK v2 accepts `webhook.secret` but never
  transmits it — it only appends `hf_webhook=<url>` (`src/v2/client.ts`,
  `subscribe`). The `X-Webhook-Secret-Key` header belongs to the legacy v1
  job-set API. So v2 deliveries carry no signature; we rely on the HMAC token in
  the URL plus re-fetching the status. Revisit if the docs add a signature.
- **Accessibility:** secondary text uses the paper palette's `#665F57`;
  validate text and focus contrast when changing theme tokens.

## Product-workbench redesign (2026-10-23)

- **Positioning:** Vendo is a commerce production desk for listing sets,
  lifestyle imagery, campaign variations, and short product films. The home
  page and primary navigation lead with those jobs; model choice stays inside
  the workflow.
- **Visual system:** warm paper (`#F4F0E8`), white paper (`#FFFDF8`), ink
  (`#25231F`), terracotta (`#B94C32`), and mineral blue (`#476B82`); editorial
  serif display type; sentence case. Public, account, and library pages use the
  light theme. The generation canvas may retain a contained dark surface where
  it improves media review.
- **Distinctiveness:** remove fluorescent lime, full-bleed black hero
  gradients, all-caps display headings, and model-first navigation. Product
  photos and assets take priority over platform/model branding.
- **Behavioral contract:** this is a presentation and information-architecture
  change. Auth, billing, generation lifecycle, model schemas, credit pricing,
  media ownership, and publication behavior remain unchanged. Route-by-route
  expectations live in `docs/ui-inventory.md`.
- **Local tester:** `pnpm db:init --test-user=seller@vendo.test` creates or
  reuses a passwordless user only when MongoDB is loopback and the process is
  not in production. Welcome credits are granted through the ledger and magic
  link delivery remains the existing dev/E2E mailbox flow.
