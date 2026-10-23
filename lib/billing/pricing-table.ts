import generated from "./pricing.generated.json"

import type { PriceRule, PricingTable } from "./pricing-types"

/**
 * USD cost rules for the active commerce shortlist. Estimate-synced rules in
 * pricing.generated.json override these values; Wan returns a description
 * instead of a numeric estimate and uses the provider's published rate tiers.
 * Qwen values are provisional until confirmed by the authorized account.
 */
const PLACEHOLDER = "placeholder" as const
const DESCRIPTION = "description" as const

const request = (usd: number, factors?: PriceRule["factors"]): PriceRule => ({
  usd,
  per: "request",
  ...(factors ? { factors } : {}),
  source: PLACEHOLDER,
})

const wan3: PriceRule = {
  usd: 0.1,
  per: "second",
  factors: { resolution: { "480p": 0.5, "720p": 1, "1080p": 2 } },
  source: DESCRIPTION,
}

export const PLACEHOLDER_PRICING: PricingTable = {
  "alibaba/qwen-image-3/text-to-image": request(0.03, {
    resolution: { "1k": 1, "2k": 1.5 },
  }),
  "alibaba/qwen-image-3/edit": request(0.04, {
    resolution: { "1k": 1, "2k": 1.875 },
  }),
  // Provider rate: $0.05/s at 480p, $0.10/s at 720p, $0.20/s at 1080p.
  "alibaba/wan-3.0/text-to-video": { ...wan3 },
  "alibaba/wan-3.0/image-to-video": { ...wan3 },
  "alibaba/wan-3.0/reference-to-video": { ...wan3 },
}

/** Estimate-derived rules override the shortlist defaults. */
export const PRICING_TABLE: PricingTable = {
  ...PLACEHOLDER_PRICING,
  ...(generated as PricingTable),
}
