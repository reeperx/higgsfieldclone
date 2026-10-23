import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { getModel, MODELS, parseSettings } from "@/generation/catalog"
import { groupMedia, inferInputMode } from "@/generation/catalog/media-inputs"
import type {
  GenerationPlane,
  MediaItem,
  MediaRole,
  ModelEntry,
  PlatformRequest,
} from "@/generation/catalog/types"
import { toPlatform } from "@/generation/to-platform"

/* ── Plane builder ──────────────────────────────────────────────────────── */

const PROMPT =
  "A lighthouse keeper climbs a spiral staircase at dusk, warm lamp light, slow push-in."

const EXT: Record<MediaRole, string> = {
  start: "png",
  end: "png",
  reference: "jpg",
  video: "mp4",
  source: "mp4",
  audio: "mp3",
}

type Attach = Partial<Record<MediaRole, number>>

type PlaneOptions = {
  prompt?: string
  settings?: Record<string, unknown>
  /** Explicit input mode; inferred from the media like the UI does when absent. */
  mode?: string
  /** Skip mode inference (simulates a client that sends no inputMode). */
  noMode?: boolean
}

function mediaItems(attach: Attach): MediaItem[] {
  const items: MediaItem[] = []
  for (const [role, count] of Object.entries(attach) as [MediaRole, number][])
    for (let i = 1; i <= count; i++)
      items.push({
        id: `${role}-${i}`,
        role,
        url: `https://media.example.com/${role}-${i}.${EXT[role]}`,
      })
  return items
}

function plane(
  id: string,
  attach: Attach = {},
  options: PlaneOptions = {}
): GenerationPlane {
  const model = getModel(id)
  const items = mediaItems(attach)
  return {
    model: id,
    inputMode: options.noMode
      ? undefined
      : (options.mode ?? inferInputMode(model, items)),
    prompt: { text: options.prompt ?? PROMPT },
    media: groupMedia(items),
    settings: parseSettings(model, options.settings ?? {}),
  }
}

/* ── Every model × every supported input mode ───────────────────────────── */

type Case = {
  name: string
  path: string
  media?: Attach
  mode?: string
  prompt?: string
  settings?: Record<string, unknown>
}

const text = (path: string): Case => ({ name: "text", path })

const CASES: Record<string, Case[]> = {
  /* Image */
  "soul-2": [text("higgsfield-ai/soul/v2/standard")],
  soul: [
    text("higgsfield-ai/soul/standard"),
    {
      name: "image reference",
      path: "higgsfield-ai/soul/standard",
      media: { reference: 1 },
    },
  ],
  "marketing-image-flare": [
    text("marketing-studio/image/flare"),
    {
      name: "references",
      path: "marketing-studio/image/flare",
      media: { reference: 3 },
      settings: { quality: "max", resolution: "4k", aspectRatio: "9:16" },
    },
  ],
  "marketing-image-sunburst": [
    text("marketing-studio/image/sunburst"),
    {
      name: "references",
      path: "marketing-studio/image/sunburst",
      media: { reference: 2 },
    },
  ],
  "grok-image-2": [
    text("xai/grok-imagine-image-2.0"),
    {
      name: "edit with references",
      path: "xai/grok-imagine-image-2.0",
      media: { reference: 2 },
    },
  ],
  "qwen-image-3": [
    text("alibaba/qwen-image-3/text-to-image"),
    {
      name: "edit",
      path: "alibaba/qwen-image-3/edit",
      media: { reference: 3 },
    },
    {
      name: "extend off disables thinking",
      path: "alibaba/qwen-image-3/text-to-image",
      settings: { promptExtend: false, thinking: true },
    },
  ],
  "ideogram-4": [
    text("ideogram/v4.0"),
    {
      name: "remix with image weight",
      path: "ideogram/v4.0",
      media: { reference: 1 },
      settings: { imageWeight: 80, renderingSpeed: "QUALITY" },
    },
  ],

  /* Video — create */
  "seedance-2.5": [
    text("bytedance/seedance-2.5/text-to-video"),
    {
      name: "frames",
      path: "bytedance/seedance-2.5/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references",
      path: "bytedance/seedance-2.5/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
    },
  ],
  "seedance-2": [
    text("bytedance/seedance-2.0/text-to-video"),
    {
      name: "frames",
      path: "bytedance/seedance-2.0/image-to-video",
      media: { start: 1, end: 1 },
      prompt: "",
      settings: { resolution: "4k", duration: 15 },
    },
    {
      name: "references",
      path: "bytedance/seedance-2.0/reference-to-video",
      media: { reference: 9, video: 3, audio: 3 },
    },
  ],
  "kling-3-pro": [
    text("kling-video/v3.0/pro/text-to-video"),
    {
      name: "start and end frames",
      path: "kling-video/v3.0/pro/image-to-video",
      media: { start: 1, end: 1 },
    },
  ],
  "kling-3-turbo": [
    text("kling-video/v3.0-turbo/text-to-video"),
    {
      name: "start frame",
      path: "kling-video/v3.0-turbo/image-to-video",
      media: { start: 1 },
      settings: { resolution: "1080p" },
    },
  ],
  "cinema-studio-4": [
    text("higgsfield/cinema-studio/4.0"),
    {
      name: "references with direction",
      path: "higgsfield/cinema-studio/4.0",
      media: { reference: 2, video: 1, audio: 1 },
      settings: {
        genre: "noir",
        era: "1980s",
        cameraMovement: "dolly-in",
        colorPalette: "neon-rain-at-midnight",
        duration: 12,
      },
    },
  ],
  "wan-3": [
    text("alibaba/wan-3.0/text-to-video"),
    {
      name: "frames",
      path: "alibaba/wan-3.0/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references",
      path: "alibaba/wan-3.0/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
      settings: { thinking: true, aspectRatio: "9:16" },
    },
  ],
  "minimax-h3": [
    text("minimax/h3/text-to-video"),
    {
      name: "frames",
      path: "minimax/h3/image-to-video",
      media: { start: 1, end: 1 },
    },
    {
      name: "references with audio",
      path: "minimax/h3/reference-to-video",
      media: { reference: 2, video: 1, audio: 1 },
      settings: { duration: 15, aspectRatio: "adaptive" },
    },
  ],
  "ltx-2.5-fast": [
    text("lightricks/ltx-2.5/text-to-video/fast"),
    {
      name: "frames at 4k 48fps",
      path: "lightricks/ltx-2.5/image-to-video/fast",
      media: { start: 1, end: 1 },
      settings: {
        resolution: "4k",
        fps: "48",
        duration: "10",
        cameraMovement: "jib_up",
      },
    },
  ],
  "pixverse-v6": [
    text("pixverse/v6/text-to-video"),
    {
      name: "frames",
      path: "pixverse/v6/image-to-video",
      media: { start: 1, end: 1 },
      settings: { duration: 1, resolution: "1080p" },
    },
  ],

  /* Video — edit */
  "genjutsu-swap": [
    {
      name: "source with references",
      path: "higgsfield/genjutsu/object-swap/v1.0",
      media: { source: 1, reference: 2 },
    },
  ],
}

function run(id: string, c: Case): PlatformRequest {
  return toPlatform(
    plane(id, c.media, { prompt: c.prompt, settings: c.settings, mode: c.mode })
  )
}

describe("toPlatform: every model and input mode", () => {
  it("has cases for every catalog entry and no stale ones", () => {
    expect(Object.keys(CASES).sort()).toEqual(
      MODELS.map((model) => model.id).sort()
    )
  })

  for (const model of MODELS) {
    describe(model.id, () => {
      for (const c of CASES[model.id] ?? []) {
        it(c.name, () => {
          const result = run(model.id, c)
          expect(result.path).toBe(c.path)
          expect(result).toMatchSnapshot()
        })
      }
    })
  }
})

/* ── Bodies only use documented fields and values ───────────────────────── */

type DocField = {
  required: boolean
  type: string
  enumValues?: string[]
  min?: number
  max?: number
}

const DIGEST = new URL("../_reference/docs/digest.md", import.meta.url)

function parseDigest(): Map<string, Map<string, DocField>> {
  const endpoints = new Map<string, Map<string, DocField>>()
  let fields: Map<string, DocField> | undefined
  for (const line of readFileSync(DIGEST, "utf8").split("\n")) {
    const endpoint = /^\s+endpoint: (.+)$/.exec(line)
    if (endpoint) {
      fields = new Map()
      endpoints.set(endpoint[1]!.trim().split(" ").pop()!, fields)
      continue
    }
    if (line.startsWith("## ")) fields = undefined
    const field = /^\s{4}(\*| )(\w+): (\S+)(.*)$/.exec(line)
    if (!field || !fields) continue
    const [, star, name, type, rest] = field
    const enumMatch = /enum\[([^\]]*)\]/.exec(rest!)
    const rangeMatch = /(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)/.exec(rest!)
    fields.set(name!, {
      required: star === "*",
      type: type!,
      enumValues: enumMatch?.[1]!.split(","),
      min: rangeMatch ? Number(rangeMatch[1]) : undefined,
      max: rangeMatch ? Number(rangeMatch[2]) : undefined,
    })
  }
  return endpoints
}

/** The one workflow page the digest does not cover (see docs/decisions.md). */
const UNDIGESTED = new Set(["bytedance/seedance-2.5/text-to-video"])

describe.skipIf(!existsSync(DIGEST))(
  "bodies match the documented schema",
  () => {
    const digest = existsSync(DIGEST)
      ? parseDigest()
      : new Map<string, Map<string, DocField>>()
    const reached = new Set<string>()

    for (const model of MODELS) {
      for (const c of CASES[model.id] ?? []) {
        it(`${model.id} › ${c.name}`, () => {
          const { path, body } = run(model.id, c)
          reached.add(path)
          if (UNDIGESTED.has(path)) return
          const fields = digest.get(path)
          expect(fields, `undocumented path ${path}`).toBeDefined()
          if (!fields) return
          for (const [key, value] of Object.entries(body)) {
            const doc = fields.get(key)
            expect(
              doc,
              `${path} has no documented field "${key}"`
            ).toBeDefined()
            if (!doc) continue
            if (Array.isArray(value)) {
              expect(doc.type).toBe("array")
              if (doc.min !== undefined)
                expect(value.length).toBeGreaterThanOrEqual(doc.min)
              if (doc.max !== undefined)
                expect(value.length).toBeLessThanOrEqual(doc.max)
              continue
            }
            if (doc.enumValues)
              expect(doc.enumValues, `${path}.${key}`).toContain(String(value))
            if (typeof value === "number") {
              expect(["integer", "number"]).toContain(doc.type)
              if (doc.type === "integer")
                expect(Number.isInteger(value)).toBe(true)
              if (doc.min !== undefined)
                expect(value).toBeGreaterThanOrEqual(doc.min)
              if (doc.max !== undefined)
                expect(value).toBeLessThanOrEqual(doc.max)
            }
            if (typeof value === "boolean") expect(doc.type).toBe("boolean")
            if (typeof value === "string")
              expect(doc.type.split("|")).toContain("string")
          }
          for (const [key, doc] of fields)
            if (doc.required)
              expect(
                body,
                `${path} is missing required "${key}"`
              ).toHaveProperty(key)
        })
      }
    }

    it("covers only endpoints we still ship", () => {
      expect(digest.size).toBeGreaterThan(70)
      expect(
        digest.get("kling-video/v3.0/pro/text-to-video")?.get("prompt")?.required
      ).toBe(true)
      // The digest is a crawl of ALL platform docs, including tiers we no
      // longer ship; every path the catalog maps to (minus the one workflow
      // page the digest does not cover) must be documented in it.
      const reachedDocumented = [...reached].filter(
        (path) => !UNDIGESTED.has(path)
      )
      expect(reachedDocumented.length).toBeGreaterThan(15)
      for (const path of reachedDocumented)
        expect(digest.has(path), path).toBe(true)
    })
  }
)

/* ── Catalog metadata ───────────────────────────────────────────────────── */

const ICONS = new URL("../public/model-icons/", import.meta.url)

/** Settings in the Seedance 2.5 exemplar that fall back to the key as label. */
const UNLABELLED = new Set(["seedance-2.5.resolution"])
const DOCS_PREFIX = "https://docs.higgsfield.ai/docs/models/"
const CRAWLED = new URL("../_reference/docs/models/", import.meta.url)

function visibleStrings(model: ModelEntry): string[] {
  const strings = [
    model.label,
    model.description,
    model.bestFor ?? "",
    model.category ?? "",
    ...(model.mediaModes ?? []).map((mode) => mode.label),
  ]
  for (const field of Object.values(model.settings)) {
    strings.push(field.label ?? "", field.hint ?? "")
    if (field.type === "enum")
      strings.push(...Object.values(field.labels ?? {}))
  }
  return strings
}

describe("catalog metadata", () => {
  it("has unique ids", () => {
    const ids = MODELS.map((model) => model.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("keeps image orders below 100 and video orders from 100", () => {
    expect(MODELS.find((model) => model.id === "soul-2")?.order).toBe(0)
    expect(MODELS.find((model) => model.id === "seedance-2.5")?.order).toBe(100)
    for (const model of MODELS) {
      expect(model.order, model.id).toBeTypeOf("number")
      if (model.surface === "image") expect(model.order).toBeLessThan(100)
      if (model.surface === "video")
        expect(model.order).toBeGreaterThanOrEqual(100)
    }
  })

  for (const model of MODELS) {
    describe(model.id, () => {
      it("cites docs pages", () => {
        expect(model.docs.length).toBeGreaterThan(0)
        for (const url of model.docs) {
          expect(url.startsWith(DOCS_PREFIX)).toBe(true)
          // Every cited page was crawled into _reference/docs/models.
          const page = `${url.slice(DOCS_PREFIX.length).replace("/", "__")}.md`
          if (existsSync(CRAWLED))
            expect(existsSync(new URL(page, CRAWLED)), url).toBe(true)
        }
      })

      it("uses an installed icon", () => {
        expect(model.icon).toBeTruthy()
        expect(existsSync(new URL(`${model.icon}.svg`, ICONS))).toBe(true)
      })

      it("has picker metadata", () => {
        expect(model.family).toBeTruthy()
        expect(model.provider).toBeTruthy()
        expect(model.description).toBeTruthy()
        if (model.category)
          expect(model.category).toBe(model.category.toUpperCase())
      })

      it("never shows the platform name", () => {
        for (const value of visibleStrings(model))
          expect(value.toLowerCase()).not.toContain("higgsfield")
      })

      it("has valid setting defaults and labels", () => {
        for (const [key, field] of Object.entries(model.settings)) {
          if (!UNLABELLED.has(`${model.id}.${key}`))
            expect(field.label, `${key} label`).toBeTruthy()
          if (field.type === "enum") {
            expect(field.values).toContain(field.default)
            for (const labelled of Object.keys(field.labels ?? {}))
              expect(field.values).toContain(labelled)
          }
          if (field.type === "range") {
            expect(field.default).toBeGreaterThanOrEqual(field.min)
            expect(field.default).toBeLessThanOrEqual(field.max)
          }
        }
        expect(() => parseSettings(model, {})).not.toThrow()
      })

      it("keeps roles, modes and the enhance toggle consistent", () => {
        for (const mode of model.mediaModes ?? [])
          for (const [role, max] of Object.entries(mode.roles))
            expect(max).toBeLessThanOrEqual(model.roles[role as MediaRole] ?? 0)
        for (const role of model.requiredRoles ?? [])
          expect(model.roles[role]).toBeGreaterThan(0)
        if (model.enhanceSetting)
          expect(model.settings[model.enhanceSetting]?.type).toBe("boolean")
        if ((model.tab ?? "create") !== "create" && model.surface === "video")
          expect(model.requiredRoles ?? []).toContain("source")
      })
    })
  }
})

/* ── Rules that must reject ─────────────────────────────────────────────── */

describe("rejections", () => {
  it("rejects frames mixed with references", () => {
    expect(() =>
      toPlatform(
        plane("seedance-2", { start: 1, reference: 1 }, { noMode: true })
      )
    ).toThrow(/either frames or references/)
    expect(() =>
      toPlatform(
        plane("seedance-2", { start: 1, reference: 1 }, { mode: "frames" })
      )
    ).toThrow(/not supported with start\/end frames/)
    expect(() =>
      toPlatform(plane("wan-3", { start: 1, video: 1 }, { noMode: true }))
    ).toThrow(/either frames or references/)
  })

  it("rejects an end frame without a start frame", () => {
    expect(() => toPlatform(plane("pixverse-v6", { end: 1 }))).toThrow(
      /start frame before using an end frame/
    )
  })

  it("requires the source video on swap models", () => {
    for (const id of ["genjutsu-swap"])
      expect(() => toPlatform(plane(id, { reference: 1 })), id).toThrow(
        /source video/
      )
  })

  it("rejects Genjutsu without reference images", () => {
    expect(() =>
      toPlatform(plane("genjutsu-swap", { source: 1 }, { prompt: "" }))
    ).toThrow(/replacement image/)
  })

  it("rejects audio-only references where audio needs company", () => {
    for (const id of ["seedance-2", "minimax-h3"]) {
      expect(() => toPlatform(plane(id, { audio: 1 })), id).toThrow(
        /reference image or reference video/
      )
      expect(
        () => toPlatform(plane(id, { audio: 1 }, { noMode: true })),
        id
      ).toThrow(/reference image or reference video|image or video reference/)
    }
  })

  it("rejects prompts over the documented limit", () => {
    expect(() =>
      toPlatform(
        plane("marketing-image-flare", {}, { prompt: "a".repeat(5001) })
      )
    ).toThrow(/limited to 5,000 characters/)
    expect(() =>
      toPlatform(plane("kling-3-pro", {}, { prompt: "a".repeat(2501) }))
    ).toThrow(/limited to 2,500 characters/)
    expect(() =>
      toPlatform(plane("ideogram-4", {}, { prompt: "a".repeat(2049) }))
    ).toThrow(/limited to 2,048 characters/)
    expect(() =>
      toPlatform(
        plane("marketing-image-flare", {}, { prompt: "a".repeat(5000) })
      )
    ).not.toThrow()
  })

  it("requires a prompt where the docs do", () => {
    expect(() =>
      toPlatform(plane("kling-3-pro", {}, { prompt: "  " }))
    ).toThrow(/prompt is required/)
    expect(() => toPlatform(plane("wan-3", {}, { prompt: "" }))).toThrow(
      /prompt is required/
    )
    expect(() => toPlatform(plane("seedance-2", {}, { prompt: "" }))).toThrow(
      /Enter a prompt/
    )
  })

  it("rejects settings outside the catalog", () => {
    expect(() => parseSettings(getModel("wan-3"), { duration: 31 })).toThrow(
      /Invalid duration/
    )
    expect(() =>
      parseSettings(getModel("minimax-h3"), { duration: 16 })
    ).toThrow(/Invalid duration/)
  })
})

/* ── Mapping details worth pinning explicitly ───────────────────────────── */

describe("mapping details", () => {
  it("sends image_weight only with an Ideogram reference", () => {
    expect(toPlatform(plane("ideogram-4")).body).not.toHaveProperty(
      "image_weight"
    )
    expect(
      toPlatform(plane("ideogram-4", { reference: 1 })).body
    ).toMatchObject({ image_weight: 50 })
  })

  it("turns Qwen thinking off when prompt extension is off", () => {
    expect(
      toPlatform(
        plane("qwen-image-3", {}, { settings: { promptExtend: false } })
      ).body
    ).toMatchObject({ prompt_extend: false, enable_thinking: false })
  })

  it("omits Cinema Studio creative controls left on Auto", () => {
    const { body } = toPlatform(plane("cinema-studio-4"))
    for (const key of [
      "genre",
      "era",
      "light",
      "camera_movement",
      "color_palette",
    ])
      expect(body).not.toHaveProperty(key)
  })

  it("always sends MiniMax H3 at the fixed 2K resolution", () => {
    for (const media of [{}, { start: 1 }, { reference: 1 }] as Attach[])
      expect(toPlatform(plane("minimax-h3", media)).body.resolution).toBe("2K")
  })

  it("keeps aspect_ratio off endpoints that do not take it", () => {
    for (const [id, media] of [
      ["kling-3-pro", { start: 1 }],
      ["kling-3-turbo", { start: 1 }],
      ["pixverse-v6", { start: 1 }],
    ] as [string, Attach][])
      expect(toPlatform(plane(id, media)).body, id).not.toHaveProperty(
        "aspect_ratio"
      )
  })
})
