import generated from "./pricing.generated.json"
import type { MediaRole } from "@/generation/catalog/types"

import type { PriceRule, PricingTable } from "./pricing-types"

/**
 * Higgsfield USD cost per endpoint path.
 *
 * Three kinds of rule live here:
 * - `pnpm pricing:sync` calls the documented estimate endpoint
 *   (POST /estimate/{path}, docs/concepts/billing-and-retention) and writes
 *   pricing.generated.json, whose rules replace the placeholders below.
 * - Token-metered models answer the estimate with a pricing *description*
 *   instead of numbers. Those rules are derived by hand from that text
 *   (quoted next to each rule) and marked `source: "description"`.
 * - PLACEHOLDERS (`source: "placeholder"`) are unverified guesses. They price
 *   the local mock only: against the live API those endpoints are not sold
 *   until an admin sets a price (Admin → Models).
 * Admin overrides in the `model_pricing` collection win over all of them.
 */

const P = "placeholder" as const
const D = "description" as const

/*
 * Token-metered video: tokens = ceil(width × height × seconds × 24 / 1024).
 * Rates below are per generated second of 16:9 output (the pixel area the
 * descriptions quote; other aspect ratios differ by < 1%).
 */
const perSecondAt = (pixels: number, usdPer1kTokens: number) =>
  (pixels * 24 * usdPer1kTokens) / 1024 / 1000
const PX_480 = 854 * 480
const PX_720 = 1280 * 720
const PX_1080 = 1920 * 1080
const PX_4K = 3840 * 2160
const round5 = (value: number) => Math.round(value * 1e5) / 1e5

/** With video inputs the token rate is 0.6× and input seconds are billable. */
const withVideo = (
  roles: MediaRole[],
  maxSeconds: number
): PriceRule["inputVideo"] => ({ roles, rate: 0.6, maxSeconds })

/*
 * Seedance 2.5 and Cinema Studio 4.0: "$0.0214 per 1,000 video tokens at
 * 480p or 720p … roughly $0.2056 per second at 480p, $0.4622 at 720p";
 * "If video inputs are provided, the token rate is multiplied by 0.6 …
 * Both input and generated video durations are billable."
 */
const TOKEN_2025_720 = round5(perSecondAt(PX_720, 0.0214))
const TOKEN_2025_RES = {
  resolution: { "480p": round5(PX_480 / PX_720), "720p": 1 },
}
/*
 * Seedance 2.0: "Per 1,000 video tokens: 480p/720p/1080p $0.014, 4K $0.008;
 * with video input … 0.6× the standard rate."
 */
const SEEDANCE_2_720 = round5(perSecondAt(PX_720, 0.014))
const SEEDANCE_2_RES = {
  resolution: {
    "480p": round5(PX_480 / PX_720),
    "720p": 1,
    "1080p": round5(PX_1080 / PX_720),
    "4k": round5((PX_4K * 0.008) / (PX_720 * 0.014)),
  },
}

const described = (rule: Omit<PriceRule, "source">): PriceRule => ({
  ...rule,
  source: D,
})

const second = (
  usd: number,
  factors?: PriceRule["factors"],
  extra: Partial<PriceRule> = {}
): PriceRule => ({ usd, per: "second", factors, source: P, ...extra })

const output = (usd: number, factors?: PriceRule["factors"]): PriceRule => ({
  usd,
  per: "output",
  factors,
  source: P,
})

const request = (usd: number, factors?: PriceRule["factors"]): PriceRule => ({
  usd,
  per: "request",
  factors,
  source: P,
})

const SOUND = { sound: { on: 1.5, off: 1 } }
const MS_QUALITY = {
  quality: { low: 0.25, medium: 0.5, high: 1, xhigh: 1.5, max: 2.2 },
  resolution: { "1k": 0.7, "2k": 1, "4k": 1.8 },
}
const SOUL = { resolution: { "720p": 1, "1080p": 1.3 } }
const WAN_3_RES = { resolution: { "480p": 0.5, "720p": 1, "1080p": 2 } }
const GENJUTSU_RES = {
  resolution: { "480p": round5(0.318 / 0.681), "720p": 1 },
}

export const PLACEHOLDER_PRICING: PricingTable = {
  /* ── Image ── */
  "higgsfield-ai/soul/v2/standard": output(0.09, SOUL),
  "higgsfield-ai/soul/standard": output(0.08, SOUL),
  "marketing-studio/image/flare": request(0.08, MS_QUALITY),
  "marketing-studio/image/sunburst": request(0.08, MS_QUALITY),
  "xai/grok-imagine-image-2.0": request(0.05, {
    quality: { low: 0.6, medium: 1 },
    resolution: { "1k": 1, "2k": 1.5 },
  }),
  "alibaba/qwen-image-3/text-to-image": request(0.03, {
    resolution: { "1k": 1, "2k": 1.5 },
  }),
  "alibaba/qwen-image-3/edit": request(0.04, {
    resolution: { "1k": 1, "2k": 1.5 },
  }),
  "ideogram/v4.0": request(0.06, {
    rendering_speed: { TURBO: 0.5, DEFAULT: 1, QUALITY: 1.5 },
  }),

  /* ── Seedance ── */
  "bytedance/seedance-2.5/text-to-video": described({
    usd: TOKEN_2025_720,
    per: "second",
    factors: TOKEN_2025_RES,
  }),
  "bytedance/seedance-2.5/image-to-video": described({
    usd: TOKEN_2025_720,
    per: "second",
    factors: TOKEN_2025_RES,
  }),
  "bytedance/seedance-2.5/reference-to-video": described({
    usd: TOKEN_2025_720,
    per: "second",
    factors: TOKEN_2025_RES,
    inputVideo: withVideo(["video"], 30),
  }),
  "bytedance/seedance-2.0/text-to-video": described({
    usd: SEEDANCE_2_720,
    per: "second",
    factors: SEEDANCE_2_RES,
  }),
  "bytedance/seedance-2.0/image-to-video": described({
    usd: SEEDANCE_2_720,
    per: "second",
    factors: SEEDANCE_2_RES,
  }),
  "bytedance/seedance-2.0/reference-to-video": described({
    usd: SEEDANCE_2_720,
    per: "second",
    factors: SEEDANCE_2_RES,
    inputVideo: withVideo(["video"], 15),
  }),

  /* ── Kling ── */
  "kling-video/v3.0-turbo/text-to-video": second(0.06, {
    resolution: { "720p": 1, "1080p": 1.5 },
  }),
  "kling-video/v3.0-turbo/image-to-video": second(0.06, {
    resolution: { "720p": 1, "1080p": 1.5 },
  }),
  "kling-video/v3.0/pro/text-to-video": second(0.112, SOUND),
  "kling-video/v3.0/pro/image-to-video": second(0.112, SOUND),

  /* ── Alibaba: Wan ── */
  // "Priced per generated second by resolution: 480p $0.05, 720p $0.10, or 1080p $0.20."
  "alibaba/wan-3.0/text-to-video": described({
    usd: 0.1,
    per: "second",
    factors: WAN_3_RES,
  }),
  "alibaba/wan-3.0/image-to-video": described({
    usd: 0.1,
    per: "second",
    factors: WAN_3_RES,
  }),
  "alibaba/wan-3.0/reference-to-video": described({
    usd: 0.1,
    per: "second",
    factors: WAN_3_RES,
  }),

  /* ── Studio models ── */
  "higgsfield/cinema-studio/4.0": described({
    usd: TOKEN_2025_720,
    per: "second",
    factors: TOKEN_2025_RES,
    inputVideo: withVideo(["video"], 30),
  }),
  // "Each second of input video costs $0.318 at 480p or $0.681 at 720p.
  // Input duration is rounded up to the nearest whole second."
  "higgsfield/genjutsu/object-swap/v1.0": described({
    usd: 0.681,
    per: "second",
    defaultUnits: 30,
    sourceLength: true,
    factors: GENJUTSU_RES,
  }),

  /* ── Others ── */
  "lightricks/ltx-2.5/text-to-video/fast": second(0.04, {
    resolution: { "720p": 1, "1080p": 1.5, "2k": 3, "4k": 6 },
  }),
  "lightricks/ltx-2.5/image-to-video/fast": second(0.04, {
    resolution: { "720p": 1, "1080p": 1.5, "2k": 3, "4k": 6 },
  }),
  "minimax/h3/text-to-video": second(0.08),
  "minimax/h3/image-to-video": second(0.08),
  // "2K output costs $0.13 per generated second. The first five reference
  // images are included; each additional reference image costs $0.08."
  "minimax/h3/reference-to-video": described({
    usd: 0.13,
    per: "second",
    perItem: { role: "reference", included: 5, usd: 0.08 },
  }),
  "pixverse/v6/text-to-video": second(0.05, {
    resolution: { "360p": 0.5, "540p": 0.7, "720p": 1, "1080p": 1.8 },
  }),
  "pixverse/v6/image-to-video": second(0.05, {
    resolution: { "360p": 0.5, "540p": 0.7, "720p": 1, "1080p": 1.8 },
  }),
}

/** Static table: estimate-derived rules (if synced) over placeholders. */
export const PRICING_TABLE: PricingTable = {
  ...PLACEHOLDER_PRICING,
  ...(generated as PricingTable),
}
