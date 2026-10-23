import { describe, expect, it } from "vitest"

import {
  activeSurfaces,
  getModel,
  MODELS,
  parseSettings,
} from "@/generation/catalog"
import { groupMedia, inferInputMode } from "@/generation/catalog/media-inputs"
import type {
  GenerationPlane,
  MediaItem,
  MediaRole,
} from "@/generation/catalog/types"
import { toPlatform } from "@/generation/to-platform"
import { PRESET_SEED } from "@/lib/presets/seed-data"

const PROMPT = "A reusable water bottle on a clean studio surface."
const mediaExtension: Record<MediaRole, string> = {
  start: "png",
  end: "png",
  reference: "jpg",
  video: "mp4",
  source: "mp4",
  audio: "mp3",
}

function createMedia(roles: Partial<Record<MediaRole, number>>): MediaItem[] {
  return Object.entries(roles).flatMap(([role, count]) =>
    Array.from({ length: count ?? 0 }, (_, index) => {
      const mediaRole = role as MediaRole
      return {
        id: `${mediaRole}-${index + 1}`,
        url: `https://media.example.com/${mediaRole}-${index + 1}.${mediaExtension[mediaRole]}`,
        role: mediaRole,
      }
    })
  )
}

function plane(
  modelId: string,
  attachments: Partial<Record<MediaRole, number>> = {},
  prompt = PROMPT,
  overrides: Record<string, unknown> = {}
): GenerationPlane {
  const model = getModel(modelId)
  const media = createMedia(attachments)
  return {
    model: modelId,
    inputMode: inferInputMode(model, media),
    prompt: { text: prompt },
    media: groupMedia(media),
    settings: parseSettings(model, overrides),
  }
}

describe("commerce model shortlist", () => {
  it("exposes only the two documented product-work models", () => {
    expect(MODELS.map((model) => model.id)).toEqual(["qwen-image-3", "wan-3"])
    expect(activeSurfaces()).toEqual(["image", "video"])
    expect(MODELS.every((model) => model.docs?.length)).toBe(true)
  })

  it("keeps every seeded effect compatible with the active models", () => {
    for (const preset of PRESET_SEED) {
      const model = getModel(preset.modelId)
      expect(model.surface).toBe(preset.surface)
      expect(() => parseSettings(model, preset.settings)).not.toThrow()
    }
  })
})

describe("Qwen Image 3 request mapping", () => {
  it("creates product imagery without client-controlled paths", () => {
    const result = toPlatform(plane("qwen-image-3"))
    expect(result).toEqual({
      path: "alibaba/qwen-image-3/text-to-image",
      body: {
        prompt: PROMPT,
        resolution: "1k",
        aspect_ratio: "1:1",
        prompt_extend: true,
        enable_thinking: true,
      },
    })
  })

  it("uses owned product references for edit requests", () => {
    const result = toPlatform(plane("qwen-image-3", { reference: 2 }))
    expect(result.path).toBe("alibaba/qwen-image-3/edit")
    expect(result.body.image_urls).toEqual([
      "https://media.example.com/reference-1.jpg",
      "https://media.example.com/reference-2.jpg",
    ])
  })

  it("does not request thinking when prompt enhancement is disabled", () => {
    const result = toPlatform(
      plane("qwen-image-3", {}, PROMPT, {
        promptExtend: false,
        thinking: true,
      })
    )
    expect(result.body.prompt_extend).toBe(false)
    expect(result.body.enable_thinking).toBe(false)
  })

  it("rejects unsupported resolution and missing prompts", () => {
    expect(() =>
      parseSettings(getModel("qwen-image-3"), { resolution: "4k" })
    ).toThrow()
    expect(() => toPlatform(plane("qwen-image-3", {}, "   "))).toThrow(
      /prompt is required/i
    )
  })
})

describe("Wan 3.0 product video request mapping", () => {
  it("defaults to the cost-conscious 720p no-audio setting", () => {
    const result = toPlatform(plane("wan-3"))
    expect(result.path).toBe("alibaba/wan-3.0/text-to-video")
    expect(result.body).toMatchObject({
      resolution: "720p",
      duration: 5,
      generate_audio: false,
    })
  })

  it("maps product start and end frames", () => {
    const result = toPlatform(plane("wan-3", { start: 1, end: 1 }))
    expect(result.path).toBe("alibaba/wan-3.0/image-to-video")
    expect(result.body).toMatchObject({
      image_url: "https://media.example.com/start-1.png",
      end_image_url: "https://media.example.com/end-1.png",
    })
  })

  it("maps reference inputs to the correct workflow", () => {
    const result = toPlatform(
      plane("wan-3", { reference: 1, video: 1, audio: 1 })
    )
    expect(result.path).toBe("alibaba/wan-3.0/reference-to-video")
    expect(result.body).toMatchObject({
      image_urls: ["https://media.example.com/reference-1.jpg"],
      video_urls: ["https://media.example.com/video-1.mp4"],
      audio_urls: ["https://media.example.com/audio-1.mp3"],
    })
  })

  it("rejects mixed frames and references and unsupported durations", () => {
    expect(() =>
      toPlatform(plane("wan-3", { start: 1, reference: 1 }))
    ).toThrow()
    expect(() => parseSettings(getModel("wan-3"), { duration: 31 })).toThrow(
      /Invalid duration/
    )
  })
})
