// Wan 3.0 — text / image / reference to video.
// Sources:
//   https://docs.higgsfield.ai/docs/models/wan-3
//   https://docs.higgsfield.ai/docs/models/wan-3/text-to-video
//   https://docs.higgsfield.ai/docs/models/wan-3/image-to-video
//   https://docs.higgsfield.ai/docs/models/wan-3/reference-to-video
// All three workflows share prompt (required), duration, resolution,
// aspect_ratio, generate_audio and enable_thinking. Not exposed: seed,
// file_url, link_url.
import {
  assertFramesOrReferences,
  compact,
  first,
  requirePrompt,
  urls,
} from "../mappers"
import type { GenerationPlane, ModelEntry, PlatformRequest } from "../types"

const DOCS = "https://docs.higgsfield.ai/docs/models"

const settings = {
  aspectRatio: {
    type: "enum",
    values: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
    default: "adaptive",
    label: "Aspect ratio",
    labels: { adaptive: "Adaptive" },
    hint: "Adaptive lets the model pick the framing.",
  },
  duration: {
    type: "range",
    min: 2,
    max: 30,
    default: 5,
    unit: "s",
    label: "Duration",
  },
  resolution: {
    type: "enum",
    values: ["480p", "720p", "1080p"],
    default: "720p",
    label: "Resolution",
  },
  generateAudio: {
    type: "boolean",
    default: false,
    label: "Generate audio",
    hint: "Native soundtrack and effects.",
  },
  thinking: {
    type: "boolean",
    default: false,
    label: "Thinking",
    hint: "Plans the shot before generating; slower.",
  },
} as const satisfies ModelEntry["settings"]

function mapWan3(
  plane: GenerationPlane,
  prefix: string,
  label: string
): PlatformRequest {
  assertFramesOrReferences(plane)
  const start = first(plane, "start")
  const refs = urls(plane, "reference")
  const videos = urls(plane, "video")
  const audios = urls(plane, "audio")
  const shared = {
    prompt: requirePrompt(plane, label),
    duration: plane.settings.duration,
    resolution: plane.settings.resolution,
    aspect_ratio: plane.settings.aspectRatio,
    generate_audio: plane.settings.generateAudio,
    enable_thinking: plane.settings.thinking,
  }
  if (start)
    return {
      path: `${prefix}/image-to-video`,
      body: compact({
        ...shared,
        image_url: start,
        end_image_url: first(plane, "end"),
      }),
    }
  if (refs.length || videos.length || audios.length)
    return {
      path: `${prefix}/reference-to-video`,
      body: compact({
        ...shared,
        image_urls: refs.length ? refs : undefined,
        video_urls: videos.length ? videos : undefined,
        audio_urls: audios.length ? audios : undefined,
      }),
    }
  return { path: `${prefix}/text-to-video`, body: compact(shared) }
}

const meta = {
  surface: "video",
  family: "Wan",
  provider: "Alibaba",
  icon: "wan",
  roles: { start: 1, end: 1, reference: 10, video: 5, audio: 5 },
  mediaModes: [
    { id: "frames", label: "Frames", roles: { start: 1, end: 1 } },
    {
      id: "references",
      label: "References",
      roles: { reference: 10, video: 5, audio: 5 },
      requireAny: true,
    },
  ],
  requirePrompt: true,
  settings,
} satisfies Partial<ModelEntry>

export const wan3: ModelEntry = {
  ...meta,
  id: "wan-3",
  label: "Wan 3.0",
  description:
    "Long takes up to 30 s with native sound, from text, start and end frames, or image, video and audio references.",
  bestFor: "Longer shots with sound from mixed references",
  badges: ["NEW", "AUDIO"],
  category: "GENERAL",
  order: 130,
  docs: [
    `${DOCS}/wan-3`,
    `${DOCS}/wan-3/text-to-video`,
    `${DOCS}/wan-3/image-to-video`,
    `${DOCS}/wan-3/reference-to-video`,
  ],
  toPlatform: (plane) => mapWan3(plane, "alibaba/wan-3.0", "Wan 3.0"),
}

const models = [wan3]
export default models
