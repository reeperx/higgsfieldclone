# Vendo model catalog

Vendo's model picker is intentionally limited to two e-commerce workflows:
product imagery with product-reference editing, and short product video.
Model paths and request bodies stay server-side and are mapped from the catalog.
This catalog describes documented contracts, not permission to sell access to
the hosted API.

## Authorization and availability

Live Higgsfield requests are gated by `HF_SAAS_APPROVAL_REFERENCE`. Keep the
reference unset until actual written authorization covers Vendo's customer-
facing SaaS, selected models, end users, and applicable flow-down terms. The
gate is not evidence of authorization. Local development uses the mock API.
See [`legal-risk-register.md`](./legal-risk-register.md).

The REST docs and account-specific pricing were reviewed 2026-10-23. The
authenticated estimate endpoint and provider console are authoritative for
the account and exact input settings. Placeholder rules are not a promise of
customer pricing.

## Current shortlist

| Picker id | Surface | Workflows | REST paths | Product fit |
|---|---|---|---|---|
| `qwen-image-3` | Image | Text-to-image when no references are supplied; edit with 1–3 references | `alibaba/qwen-image-3/text-to-image`, `alibaba/qwen-image-3/edit` | Listing imagery and reference-led edits that keep the seller's product as the subject |
| `wan-3` | Video | Text-to-video, image-to-video, reference-to-video | `alibaba/wan-3.0/{text-to-video,image-to-video,reference-to-video}` | Short product films and campaign motion from a seller's source image or references |

Qwen Image 3 exposes resolution, aspect ratio, prompt extension, and thinking
settings. Wan 3.0 exposes aspect ratio, duration, resolution, generated audio,
and thinking. The model-family files cite the upstream workflow documentation
and map settings through `toPlatform`.

## Cost, margin, and performance

Public list prices checked 2026-10-23 list Qwen Image 3 Edit at $0.04 for 1K
and $0.075 for 2K. Wan 3.0 is listed at $0.05 per generated second for 480p,
$0.10 for 720p, and $0.20 for 1080p before applicable account discounts. Use
the authenticated estimate endpoint for actual request-level costs; its
result and the account console supersede these indicative prices.

The two-model shortlist is chosen for product-reference workflows and public
price evidence, not because either has proven better latency or reliability.
No public source established consistent latency, an SLA, or higher rate limits
for these models. Higgsfield limits are account/model-specific; excess
generations can queue. Do not advertise "fast", reliable, or high-capacity
generation until measured on an authorized account.

`CREDIT_MARKUP=2.0` is only an internal USD-based price rule. It is not a
verified net margin: plan utilization, ZAR/USD conversion, payment fees,
refunds, tax, and upstream price changes affect contribution margin. Keep the
estimate guard enabled and recalculate after provider pricing changes.

## Models removed from the picker

The former catalog included Soul, Marketing Image, Grok Image, Ideogram,
Seedance, Kling, Cinema Studio, MiniMax, PixVerse, LTX, and Genjutsu entries.
They were removed from the active source catalog to reduce choice and avoid
selling a broad, costly model directory before the provider authorization and
account economics are established. This is not a claim that those models are
inferior. Restore one only after reviewing product fit, current request docs,
per-input pricing, provider terms, and account-level performance; update
`tests/catalog.test.ts`, `lib/billing/pricing-table.ts`, and this document.

Other related models such as Z-Image Turbo and Recraft V4.1 Utility were not
selected for the initial picker: the former is text-to-image without a
reference-conditioned product-edit workflow; the latter is a utility/style
model rather than a clear product-photo default. Their public price alone is
not sufficient to establish product fidelity or customer value.

## Adding a model

1. Add one `generation/catalog/models/<family>.ts` file using only documented
   request fields and cite every relevant docs URL in its header.
2. Run `pnpm models` to regenerate `models.generated.ts`; never edit the
   generated barrel by hand.
3. Add and test a price rule in `lib/billing/pricing-table.ts`. Unverified
   prices must remain unavailable for live submissions.
4. Update catalog tests and this document. Confirm provider authorization,
   model-specific terms, retention restrictions, rate limits, and performance
   before exposing it to customers.
