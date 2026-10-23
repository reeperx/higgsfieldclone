# Vendo model catalog

Source of truth for which Higgsfield models Vendo exposes, where each one's REST
contract comes from, and why anything is left out.

- **Researched:** 2026-09-26, against `https://docs.higgsfield.ai/docs/llms.txt`,
  the two category pages (`/docs/models/image-generation`, `/docs/models/video-generation`)
  and every workflow page they link (81 pages crawled; digest kept in
  `_reference/docs/digest.md`; the digest intentionally still covers endpoints we
  no longer ship — `tests/catalog.test.ts` only asserts that every path we *do*
  reach is documented). The docs state the platform catalog covers **82 entries
  listed for sale as of 2026-09-22: 16 image and 66 video**.
- **Vendo keep-list:** 2026-10 re-scoped to e-commerce product photography and
  video — **17 picker entries across 14 family files** (the same REST contracts,
  re-selected for product work). Everything outside the keep-list was pruned
  from the picker and pricing table (see *Pruned* at the bottom); re-adding a
  model is one file + `pnpm models` + a price rule.
- **Precedence:** live docs win for API behavior. The template
  (`higgsfield-ai/app-templates`, commit `b29cdab`) is historical scaffold
  provenance only; Vendo's current interaction and visual system is defined in
  `docs/ui-inventory.md`. Every API disagreement is listed in
  `docs/decisions.md` §"Docs vs template".
- **Price source:** the console price list needs an account login we don't have.
  The docs document `POST /estimate/{endpoint}` (billing-and-retention), so
  prices are filled by `pnpm pricing:sync`, which calls the estimate endpoint
  for every shipped path and writes `lib/billing/pricing.generated.json`
  (stale keys for pruned paths are harmless). Token-metered endpoints return a
  pricing description instead; those rules are derived from its text
  (`source: "description"`). Anything else keeps a flagged placeholder
  (`source: "placeholder"`), which the live API never sells until an admin
  prices it (see `docs/runbook.md` → Pricing).

Status legend: **Live** = documented REST endpoint, wired into the picker ·
**Token-billed** = endpoint takes no per-second price; billed from the pricing
description the estimate endpoint returns (rules derived in
`lib/billing/pricing-table.ts`).

## Image (7 picker entries)

| Picker id | Label | REST path(s) | Inputs / modes | Settings (UI → API) | Status |
|---|---|---|---|---|---|
| `soul-2` | Soul 2 | `higgsfield-ai/soul/v2/standard` | prompt only | aspect 9:16·16:9·4:3·3:4·1:1·2:3·3:2 (1:1) → `aspect_ratio`; resolution 720p·1080p → `resolution`; batch 1·4 → `batch_size`; enhance → `enhance_prompt` | Live |
| `soul` | Soul | `higgsfield-ai/soul/standard` | prompt; optional 1 reference image → `image_reference_url` | aspect (4:3 default); resolution; batch 1·4; enhance | Live |
| `marketing-image-flare` | Marketing Image 2.5 Flare | `marketing-studio/image/flare` | prompt (≤5,000 chars, enforced); 0–16 reference images → `image_urls` | quality low·medium·high·xhigh·max (high); resolution 1k·2k·4k (2k); aspect auto·1:1·3:2·2:3·4:3·3:4·16:9·9:16·21:9 (auto) | Token-billed |
| `marketing-image-sunburst` | Marketing Image 2.5 Sunburst | `marketing-studio/image/sunburst` | as Flare | as Flare | Token-billed |
| `grok-image-2` | Grok Image 2.0 | `xai/grok-imagine-image-2.0` | prompt; 0–10 reference images → `image_urls` (edit) | quality low·medium; resolution 1k·2k; aspect auto + 9 ratios | Live |
| `qwen-image-3` | Qwen Image 3 | `alibaba/qwen-image-3/text-to-image` · `alibaba/qwen-image-3/edit` | prompt; 0 refs → text-to-image, 1–3 refs → edit | resolution 1k·2k; aspect (10); prompt extend; thinking (requires extend) | Live |
| `ideogram-4` | Ideogram 4.0 | `ideogram/v4.0` | prompt (2–2,048 chars, enforced); optional 1 reference → `image_url` + `image_weight` | aspect (23); rendering speed TURBO·DEFAULT·QUALITY; image weight 1–100 (only with a reference) | Live |

## Video (10 picker entries)

Generator tabs: **Create** (text/frames/references), **Edit** (a source video is
required).

| Picker id | Tab | Label | REST path(s) | Inputs / modes | Key settings | Status |
|---|---|---|---|---|---|---|
| `seedance-2.5` | Create | Seedance 2.5 | `bytedance/seedance-2.5/{text-to-video,image-to-video,reference-to-video}` | frames (start → `image_url`, end → `end_image_url`) **or** references (≤30 img, ≤10 video, ≤10 audio, ≤50 total) | aspect (6, t2v/r2v only); duration 4–30; resolution 480p·720p; audio; bitrate standard·high | Live |
| `seedance-2` | Create | Seedance 2.0 | `bytedance/seedance-2.0/{text-to-video,image-to-video,reference-to-video}` | frames **or** references (≤9 img, ≤3 video, ≤3 audio; audio alone not enough) | aspect; duration 4–15; resolution 480p·720p·1080p·4k; audio | Live |
| `kling-3-pro` | Create | Kling 3.0 Pro | `kling-video/v3.0/pro/{text-to-video,image-to-video}` | text or start (+ optional end → `last_image_url`) | aspect (t2v); duration 3–15; sound on·off; cfg 0–1; multi-shot | Live |
| `kling-3-turbo` | Create | Kling 3.0 Turbo | `kling-video/v3.0-turbo/{text-to-video,image-to-video}` | text or start frame | aspect (t2v); duration 3–15; resolution 720p·1080p | Live |
| `cinema-studio-4` | Create | Cinema Studio 4.0 | `higgsfield/cinema-studio/4.0` | prompt; optional refs ≤30 img, ≤10 video, ≤10 audio | duration 4–30; resolution 480p·720p; aspect; audio; genre, era, light, pacing, lens, camera, aperture, movement, palette (each "Auto" = omitted) | Token-billed |
| `wan-3` | Create | Wan 3.0 | `alibaba/wan-3.0/{text-to-video,image-to-video,reference-to-video}` | text, frames (start+end), or refs (≤10 img, ≤5 video, ≤5 audio) | aspect incl. adaptive; duration 2–30; resolution 480p·720p·1080p; audio; thinking | Token-billed |
| `minimax-h3` | Create | MiniMax H3 | `minimax/h3/{text-to-video,image-to-video,reference-to-video}` | text, frames, or refs (1–9 img / 1–3 video, ≤3 audio only alongside) | duration 5–15; aspect incl. auto/adaptive; resolution fixed `2K` | Live (refs token-billed) |
| `pixverse-v6` | Create | PixVerse V6 | `pixverse/v6/{text-to-video,image-to-video}` | text or start (+ end) | duration 1–15; resolution 360p–1080p; aspect (t2v); audio | Live |
| `ltx-2.5-fast` | Create | LTX-2.5 Fast | `lightricks/ltx-2.5/{text-to-video,image-to-video}/fast` | text or start (+ optional end → `end_image_url`) | duration 6·8·10; resolution up to 4k; fps 24·25·48·50; aspect 16:9·9:16; audio; camera movement | Live |
| `genjutsu-swap` | Edit | Genjutsu Object Swap | `higgsfield/genjutsu/object-swap/v1.0` | source video (≥4 s, ≥409,600 px/frame) + 1–8 images; **billed per source second** (`sourceLength` rule, 30 s default) | resolution 720p·480p | Token-billed |

## Why these 17

The picker is an implementation detail inside product workflows, not the
primary route or homepage hierarchy. See `docs/ui-inventory.md` for the
product-first page map.

Product-photo and product-video work needs four capabilities, and each kept
entry covers a distinct job:

- **Packshots / static product imagery:** Soul 2 + Soul (clean, cheap, batch 4),
  Ideogram 4 (typography/packaging text), Qwen 3 + Grok Image 2 (edit-grade
  references), Marketing Flare/Sunburst (max-quality hero imagery).
- **Model-in-scene imagery:** Marketing Flare/Sunburst (high-fidelity composite).
- **Product video:** Seedance 2.5/2.0, Kling 3.0 Pro/Turbo, Cinema Studio 4,
  Wan 3.0, MiniMax H3, PixVerse V6, LTX-2.5 Fast.
- **Re-compositing an existing product video:** Genjutsu Object Swap (put a new
  product into a shot).

## Pruned (kept out of Vendo deliberately)

The prune is reversible per family: restore the file/entry in
`generation/catalog/models/`, run `pnpm models`, `pnpm test -u`, and add a price
rule in `lib/billing/pricing-table.ts`.

| Family | What went and why |
|---|---|
| Kling tiering | `kling-3-std`/`kling-3-4k` (pro + turbo cover the range), `kling-2.6`, `kling-2.5-turbo` (+std) — superseded generations |
| Kling O3 / Omni | `kling-o3`, `-video-ref`, `-edit`; `kling-omni`, `-video-ref`, `-edit` — experiment endpoints, thin product value |
| Kling motion control | `kling-3-motion-std/-pro`, `kling-2.6-motion-std/-pro` — motion transfer is niche for product ads |
| Genjutsu motion | `genjutsu-motion` — motion transfer likewise; object swap is the product job |
| Wan legacy/prime | `wan-2.6`, `wan-2.7`, `wan-3-prime` — Wan 3.0 kept as the thinking-mode video model |
| Cheap/fast experiments | `happy-horse-1.1`/`1.0`, `hailuo-2.3` — toy-tier video |
| LTX Pro | `ltx-2.5-pro` — Fast tier covers drafts and social cuts up to 4K/50fps |
| Recraft | `recraft-4.1` (4 paths) — vector/style utility, not product photography |
| Z-Image Turbo | `z-image-turbo` — speed duplicate of kept image models |
| Marketing Image 2.0 | `marketing-image-2` — Flare/Sunburst supersede it |
| Seedance edit | `seedance-2.5-edit`, `seedance-2.5-extend` — Genjutsu swap is the edit story |

## Audio (0 picker entries)

No audio-generation endpoint exists in the REST docs (their catalog is 16 image
+ 66 video). The status/webhook schemas *do* define `audio`/`audios` outputs, so
the surface is fully wired (catalog type, prompt dock, audio tile/player, R2
copy, pricing) and a test fixture model exercises it end to end, but the
**Audio nav item and `/audio` route stay hidden until an audio model file
exists**. Adding one is a single file in `generation/catalog/models/` +
`pnpm models`.

| Model | Where it exists | Status |
|---|---|---|
| Seed Audio 1.0 | Higgsfield CLI / agent API (`seed_audio`) | Not in API |
| Sonilo Music | CLI (`sonilo_music`) | Not in API |
| Mirelo Text to Audio | CLI (`mirelo_text_to_audio`) | Not in API |
| Text-to-speech (Inworld and others) | Higgsfield web app | Not in API |

## Not in API (Higgsfield web app / CLI only)

Nano Banana / 2 / 2 Lite / Pro · GPT Image 1.5 / 2 / 2.5 (the REST equivalent of
the 2.5 Flare/Sunburst variants is *Marketing Studio Image*, which is Live) ·
Seedream 4.5 / 5.0 Lite · Flux Kontext Max · Kling O1 Image · Soul Cast · Soul
Location · Cinema Studio Image 2.5 · Cinema Studio Video 2/3 (REST has **4.0**,
which is Live) · Marketing Studio Video · Google Veo 3 / 3.1 / 3.1 Lite · Gemini
Omni Flash · Seedance 1.5 Pro · upscale / outpaint / background removal · Virality
Predictor · Multi-image to 3D · all audio models above.

## v2 (documented, out of scope for v1)

| Model | REST | Note |
|---|---|---|
| Soul ID (character training) | `POST /v1/custom-references`, `GET /v1/custom-references/{id}` | Extension point: `characters` collection + `custom_reference_id` on Soul entries |
| Marketing Studio `enhance_prompt` | requires `preset_id` from `GET /marketing-studio/image/presets` | v1 sends `enhance_prompt: false` |
| Kling `elements`, `multi_prompt` | per-account element ids / custom shots | v1 sends single-shot requests; `multi_shots` toggle keeps the top-level duration |
