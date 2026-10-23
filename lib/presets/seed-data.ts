import type { Surface } from "@/generation/catalog/types"

/**
 * Launch set of shot presets for e-commerce product content. Each one is a
 * prompt template plus a model and settings; `{subject}` is replaced with the
 * user's prompt when present. Covers live in /public/media/presets and are
 * generated with our own models.
 */
export interface PresetSeed {
  slug: string
  title: string
  description: string
  surface: Surface
  modelId: string
  promptTemplate: string
  settings: Record<string, unknown>
  category: string
  order: number
}

/** Looping covers we generated for motion presets (image covers are /media/presets/<slug>.jpg). */
export const PRESET_LOOPS: Record<string, string> = {
  "dolly-zoom": "/media/loops/dolly-zoom.mp4",
  "bullet-time": "/media/loops/bullet-time.mp4",
  "floating-product": "/media/loops/floating-product.mp4",
  "drone-orbit": "/media/loops/kling.mp4",
}

export const PRESET_CATEGORIES = [
  "Product",
  "Portrait",
  "Cinematic",
  "Motion",
  "Stylized",
] as const

export const PRESET_SEED: PresetSeed[] = [
  {
    slug: "studio-product",
    title: "Studio Product",
    description:
      "Clean seamless-backdrop packshots with a crisp specular highlight.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject}, premium studio product photograph on a seamless pastel backdrop, soft box lighting, crisp specular highlight, subtle floor shadow, commercial catalog quality",
    settings: { aspectRatio: "1:1", resolution: "1k" },
    category: "Product",
    order: 1,
  },
  {
    slug: "lifestyle-model",
    title: "Lifestyle Model",
    description:
      "Bring your reference into an AI model's hands: lifestyle product-in-use shots.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "An AI model holding and using {subject}, casual lifestyle setting, natural window light, authentic in-use moment, editorial product photography",
    settings: { aspectRatio: "3:4", resolution: "1k" },
    category: "Portrait",
    order: 2,
  },
  {
    slug: "floating-product",
    title: "Levitation",
    description:
      "Products hovering mid-air in soft light with gentle drifting motion.",
    surface: "video",
    modelId: "wan-3",
    promptTemplate:
      "{subject}, product levitating in mid-air, slow gentle rotation, soft studio light, subtle particles drifting, premium commercial look",
    settings: { aspectRatio: "9:16", duration: 5, resolution: "720p" },
    category: "Product",
    order: 3,
  },
  {
    slug: "drone-orbit",
    title: "Drone Orbit",
    description:
      "A slow cinematic orbit around your product, reveal-style, from references or frames.",
    surface: "video",
    modelId: "wan-3",
    promptTemplate:
      "{subject}, camera slowly orbiting around the product, dramatic reveal, depth of field shifting, polished commercial lighting, premium ad",
    settings: { duration: 5, resolution: "720p" },
    category: "Cinematic",
    order: 4,
  },
  {
    slug: "fashion-editorial",
    title: "Fashion Editorial",
    description:
      "High-fashion model frames for apparel and accessories — bold styling, hard flash.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject} worn by a model, high fashion editorial photograph, bold avant-garde styling, direct hard flash, glossy magazine look, strong pose",
    settings: { aspectRatio: "3:4", resolution: "1k" },
    category: "Portrait",
    order: 5,
  },
  {
    slug: "golden-hour-portrait",
    title: "Golden Hour",
    description:
      "Warm, low-sun lifestyle scenes with soft rim light and creamy background blur.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "Lifestyle shot featuring {subject} in use, golden hour warm low sun, soft rim light, shallow depth of field, creamy bokeh, natural skin texture",
    settings: { aspectRatio: "3:4", resolution: "1k" },
    category: "Portrait",
    order: 6,
  },
  {
    slug: "dolly-zoom",
    title: "Dolly Zoom",
    description:
      "The vertigo push-pull on your product: it holds still while the world stretches behind.",
    surface: "video",
    modelId: "wan-3",
    promptTemplate:
      "{subject}, dramatic dolly zoom, camera pushes in while the background stretches away, product stays centered and still, tense cinematic mood",
    settings: { aspectRatio: "16:9", duration: 5, resolution: "720p" },
    category: "Motion",
    order: 7,
  },
  {
    slug: "bullet-time",
    title: "Bullet Time",
    description:
      "Frozen action while the camera sweeps around your product — ingredients suspended mid-air.",
    surface: "video",
    modelId: "wan-3",
    promptTemplate:
      "{subject}, bullet time effect, product frozen mid-motion with ingredients suspended in the air around it, camera sweeps 180 degrees, high contrast",
    settings: { aspectRatio: "16:9", duration: 5, resolution: "720p" },
    category: "Motion",
    order: 8,
  },
  {
    slug: "neon-noir",
    title: "Neon Noir",
    description:
      "Moody product hero shots under practical neon light, anamorphic flare.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject}, moody product photograph under magenta and cyan neon signage, wet reflective surface, volumetric haze, anamorphic lens flare, cinematic night",
    settings: { aspectRatio: "16:9", resolution: "1k" },
    category: "Cinematic",
    order: 9,
  },
  {
    slug: "desert-epic",
    title: "Desert Epic",
    description:
      "Sweeping dunes and heat shimmer around your product, 70mm hero framing.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject}, epic outdoor product hero shot amid towering desert dunes, heat shimmer, low golden light, vast sky, warm cinematic color grade, 70mm",
    settings: { aspectRatio: "16:9", resolution: "1k" },
    category: "Cinematic",
    order: 10,
  },
  {
    slug: "claymation",
    title: "Claymation",
    description:
      "Hand-made plasticine characters with visible fingerprints and warm set lighting.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject}, claymation style, handmade plasticine figures with visible fingerprints, stop-motion set, warm practical lighting, playful",
    settings: { aspectRatio: "4:3", resolution: "1k" },
    category: "Stylized",
    order: 11,
  },
  {
    slug: "retro-anime",
    title: "Retro Anime",
    description:
      "Late-80s cel animation ad frame with bold signage text — built for social.",
    surface: "image",
    modelId: "qwen-image-3",
    promptTemplate:
      "{subject}, 1980s cel-shaded anime advertisement, hand-painted background sky, bold signage lettering with the product name, film grain, VHS color bleed",
    settings: { aspectRatio: "16:9", resolution: "1k" },
    category: "Stylized",
    order: 12,
  },
]
