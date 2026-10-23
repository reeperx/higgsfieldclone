import { describe, expect, it } from "vitest"

import { MODELS } from "@/generation/catalog"
import type { MediaItem } from "@/generation/catalog/types"
import {
  billableUnits,
  creditsFromUsd,
  fromPrice,
  priceFor,
  roundCredits,
  toCreditTable,
  tryPriceFor,
} from "@/lib/billing/price"
import { PLACEHOLDER_PRICING, PRICING_TABLE } from "@/lib/billing/pricing-table"

const config = { markup: 2, creditUsd: 0.01 }
const table = toCreditTable(PRICING_TABLE, config)

const refImage = (): MediaItem => ({
  id: "r",
  role: "reference",
  kind: "image",
  url: "https://example.com/pack.png",
})

describe("priceFor", () => {
  it("applies the brief's formula: ceil(usd × markup / creditUsd)", () => {
    expect(creditsFromUsd(0.094, config)).toBe(19)
    expect(creditsFromUsd(0.1, config)).toBe(20)
    expect(roundCredits(0.2)).toBe(1)
    expect(roundCredits(20.0000000001)).toBe(20)
  })

  it("scales Wan video by duration and resolution", () => {
    const five = priceFor(
      "wan-3",
      { duration: 5, resolution: "720p" },
      [],
      table
    )
    const ten = priceFor(
      "wan-3",
      { duration: 10, resolution: "720p" },
      [],
      table
    )
    const low = priceFor(
      "wan-3",
      { duration: 10, resolution: "480p" },
      [],
      table
    )
    expect(five.path).toBe("alibaba/wan-3.0/text-to-video")
    expect(ten.units).toBe(five.units * 2)
    expect(Math.abs(ten.credits - five.credits * 2)).toBeLessThanOrEqual(1)
    expect(low.credits).toBeLessThan(ten.credits)
    expect(five.provisional).toBe(false)
  })

  it("prices Qwen product images by resolution", () => {
    const low = priceFor("qwen-image-3", { resolution: "1k" }, [], table)
    const high = priceFor("qwen-image-3", { resolution: "2k" }, [], table)
    expect(low.path).toBe("alibaba/qwen-image-3/text-to-image")
    expect(high.credits).toBeGreaterThan(low.credits)
  })

  it("prices reference-led Wan videos through the reference workflow", () => {
    const video: MediaItem = {
      id: "v",
      role: "video",
      kind: "video",
      url: "https://example.com/ref.mp4",
      durationSec: 4,
    }
    const withRef = priceFor(
      "wan-3",
      { duration: 5, resolution: "480p" },
      [refImage(), video],
      table,
      "a product film"
    )
    expect(withRef.path).toBe("alibaba/wan-3.0/reference-to-video")
    expect(withRef.units).toBe(5)
  })

  it("returns null or rejects when settings cannot be priced", () => {
    expect(tryPriceFor("wan-3", { duration: 99 }, [], table)).toBeNull()
    expect(() => priceFor("wan-3", { duration: 5.5 }, [], table)).toThrow(
      /duration/
    )
  })

  it("has a price for every catalog model", () => {
    const missing = MODELS.filter(
      (model) => fromPrice(model.id, table) === null
    ).map((model) => model.id)
    expect(missing).toEqual([])
  })

  it("has a rule for every endpoint a model can reach", () => {
    const base = { id: "p", url: "https://example.com/x", durationSec: 5 }
    const trials: Record<string, MediaItem[]>[] = [
      {},
      { start: [{ ...base, role: "start", kind: "image" }] },
      { reference: [{ ...base, role: "reference", kind: "image" }] },
      { video: [{ ...base, role: "video", kind: "video" }] },
      {
        source: [{ ...base, role: "source", kind: "video" }],
        reference: [{ ...base, role: "reference", kind: "image" }],
      },
      {
        start: [{ ...base, role: "start", kind: "image" }],
        source: [{ ...base, role: "source", kind: "video" }],
      },
      { source: [{ ...base, role: "source", kind: "video" }] },
    ]
    const unpriced = new Set<string>()
    for (const model of MODELS) {
      const defaults = Object.fromEntries(
        Object.entries(model.settings).map(([k, f]) => [k, f.default])
      )
      const enums = Object.entries(model.settings).flatMap(([key, field]) =>
        field.type === "enum" && field.values.length <= 6
          ? [[key, field.values] as const]
          : []
      )
      const variants: Record<string, unknown>[] = [{}]
      for (const [key, values] of enums)
        for (const value of values) variants.push({ [key]: value })
      for (let i = 0; i < enums.length; i++)
        for (let j = i + 1; j < enums.length; j++)
          for (const a of enums[i]![1])
            for (const b of enums[j]![1])
              variants.push({ [enums[i]![0]]: a, [enums[j]![0]]: b })
      for (const media of trials)
        for (const variant of variants) {
          try {
            const request = model.toPlatform!({
              model: model.id,
              prompt: { text: "coverage" },
              media,
              settings: { ...defaults, ...variant },
            })
            if (!PRICING_TABLE[request.path]) unpriced.add(request.path)
          } catch {
            /* invalid combination */
          }
        }
    }
    expect([...unpriced]).toEqual([])
  })

  it("flags every static rule as placeholder or description-derived", () => {
    for (const rule of Object.values(PLACEHOLDER_PRICING))
      expect(["placeholder", "description"]).toContain(rule.source)
  })

  it("reads units from the body, else falls back", () => {
    expect(billableUnits({ per: "request" }, {}, []).units).toBe(1)
    expect(billableUnits({ per: "second" }, { duration: 7 }, []).units).toBe(7)
    expect(billableUnits({ per: "output" }, { batch_size: 4 }, []).units).toBe(
      4
    )
    expect(billableUnits({ per: "output" }, {}, []).units).toBe(1)
  })
})
