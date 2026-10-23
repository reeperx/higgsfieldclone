/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import {
  ArrowUpRight,
  ImageIcon,
  PackageCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react"

import { ModelGlyph } from "@/components/marketing/badges"
import { CommunityWall } from "@/components/marketing/community-wall"
import { loadEffects, loadPublic } from "@/components/marketing/data"
import { EmptyCard } from "@/components/marketing/empty-card"
import { Masonry, MasonryItem } from "@/components/marketing/masonry"
import { EffectTile, TileMedia } from "@/components/marketing/media-tile"
import { ScrollRow } from "@/components/marketing/scroll-row"
import {
  FadeClamp,
  SectionHeader,
  ViewAllPill,
} from "@/components/marketing/section-header"
import { findModel, MODELS } from "@/generation/catalog"
import type { ModelEntry } from "@/generation/catalog/types"
import { FAMILY_LOOPS, familyCover, HERO } from "@/lib/showcase"

const WORKFLOWS = [
  {
    modelId: "soul-2",
    title: "Build a listing set",
    body: "Create clean, consistent product photos in the ratios your storefront needs.",
    label: "01 / Product photography",
    icon: PackageCheck,
  },
  {
    modelId: "soul",
    title: "Show it in its world",
    body: "Place your product into a considered lifestyle scene without booking a shoot.",
    label: "02 / Lifestyle",
    icon: ImageIcon,
  },
  {
    modelId: "seedance-2.5",
    title: "Give the listing motion",
    body: "Turn a product image into a short, campaign-ready video.",
    label: "03 / Product video",
    icon: Video,
  },
] as const

function generatorHref(model: ModelEntry): string {
  return `/${model.surface}?model=${encodeURIComponent(model.id)}`
}

/** One card per model family and surface, video first, each pointing at its lead model. */
function families(): { lead: ModelEntry; count: number }[] {
  const sorted = [...MODELS]
    .filter((model) => model.surface !== "audio")
    .sort(
      (a, b) =>
        (a.surface === "video" ? 0 : 1) - (b.surface === "video" ? 0 : 1) ||
        (a.order ?? 999) - (b.order ?? 999)
    )
  const byKey = new Map<string, { lead: ModelEntry; count: number }>()
  for (const model of sorted) {
    const key = `${model.surface}:${model.family}`
    const entry = byKey.get(key)
    if (entry) entry.count += 1
    else byKey.set(key, { lead: model, count: 1 })
  }
  return [...byKey.values()]
}

function SurfaceChip({ surface }: { surface: ModelEntry["surface"] }) {
  const Icon = surface === "video" ? Video : ImageIcon
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 text-xs text-foreground/80">
      <Icon className="size-3.5" aria-hidden />
      {surface === "video" ? "Video" : "Image"}
    </span>
  )
}

export default async function ExplorePage() {
  const [effects, community] = await Promise.all([
    loadEffects(),
    loadPublic({ limit: 12 }),
  ])
  const workflows: ((typeof WORKFLOWS)[number] & { model: ModelEntry })[] =
    WORKFLOWS.flatMap((workflow) => {
      const model = findModel(workflow.modelId)
      return model ? [{ ...workflow, model }] : []
    })
  const modelFamilies = families()

  return (
    <div className="flex flex-col gap-16 pb-8 md:gap-24">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden"
      >
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:gap-14 md:py-20">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-surface px-3 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
              <span className="size-2 rounded-full bg-sand" />
              Product content workspace
            </span>
            <h1
              id="hero-title"
              className="font-display max-w-[660px] text-[48px] leading-[0.98] tracking-[-0.055em] sm:text-[64px] md:text-[76px]"
            >
              Your next product shoot starts{" "}
              <span className="text-forest-soft">here.</span>
            </h1>
            <p className="max-w-[520px] text-base leading-7 text-muted-foreground md:text-lg">
              Create listing photos, lifestyle scenes and short product films
              from one workspace. Keep every take, compare the set, and ship the
              assets your store needs.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/image"
                className="btn-keycap inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold sm:w-auto"
              >
                <Sparkles className="size-4" aria-hidden /> Create product
                photos
              </Link>
              <Link
                href="/assets"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-surface px-6 text-base font-medium transition-colors hover:bg-raised sm:w-auto"
              >
                Explore the workspace
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              One place for product photos, campaign variations and video.
            </p>
          </div>
          <figure className="relative min-h-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-panel p-2 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.65)] md:min-h-[520px]">
            <img
              src={HERO.image}
              alt="A model wearing a mustard coat in a fashion campaign"
              width={1800}
              height={1012}
              fetchPriority="high"
              className="absolute inset-2 size-[calc(100%-1rem)] rounded-[22px] object-cover object-top"
            />
            <figcaption className="absolute right-5 bottom-5 left-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-panel/95 p-4 shadow-lg backdrop-blur-md">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
                  Campaign set · 4 assets
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Summer collection
                </p>
              </div>
              <span className="rounded-full bg-sand/10 px-3 py-1.5 text-xs font-semibold text-sand">
                Ready to publish
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── Promo + tool cards ───────────────────────────────────────────── */}
      <section
        aria-labelledby="tools-title"
        className="mx-auto w-full max-w-[1320px] px-4"
      >
        <h2 id="tools-title" className="sr-only">
          Start with a product workflow
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {workflows.map(({ model, title, body, label, icon: Icon }, index) => (
            <Link
              key={model.id}
              href={generatorHref(model)}
              className="group flex min-h-[260px] flex-col justify-between rounded-[24px] border border-white/10 bg-panel p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-raised hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-forest-soft/10 text-forest-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {label}
                </span>
              </div>
              <div>
                <p className="mb-2 font-mono text-xs text-forest-soft">
                  Workflow 0{index + 1}
                </p>
                <h3 className="font-display text-3xl text-foreground">
                  {title}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                  {body}
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                Open workflow <ArrowUpRight className="size-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Visual effects ───────────────────────────────────────────────── */}
      {effects.length > 0 ? (
        <section
          aria-labelledby="effects-title"
          className="mx-auto w-full max-w-[1320px] px-4"
        >
          <SectionHeader
            id="effects-title"
            title="Shot presets"
            description="White background, tabletop, lifestyle and motion looks. Pick one, add your product, generate."
            action={
              <Link
                href="/effects"
                className="btn-keycap inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold md:h-12 md:px-5 md:text-base"
              >
                <Sparkles className="size-4" aria-hidden /> Try a preset
              </Link>
            }
          />
          <FadeClamp
            href="/effects"
            label="View all presets"
            className="max-h-[720px] md:max-h-[880px]"
          >
            <Masonry columns={5} label="Presets">
              {effects.slice(0, 12).map((effect) => (
                <MasonryItem key={effect.slug}>
                  <EffectTile effect={effect} cta="Recreate" />
                </MasonryItem>
              ))}
            </Masonry>
          </FadeClamp>
        </section>
      ) : null}

      {/* ── Models strip ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="models-title"
        className="mx-auto w-full max-w-[1320px] px-4"
      >
        <SectionHeader
          id="models-title"
          title="The tools behind the shoot"
          description="A focused set of image and video engines, selected for common product-content jobs."
        />
        <ScrollRow label="Available generation engines">
          {modelFamilies.map(({ lead, count }) => {
            const loop =
              lead.surface === "video" ? FAMILY_LOOPS[lead.family] : undefined
            const cover = familyCover(lead.family, lead.surface)
            return (
              <li
                key={`${lead.surface}:${lead.family}`}
                className="w-[260px] shrink-0 snap-start md:w-[300px]"
              >
                <Link
                  href={generatorHref(lead)}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-200 hover:bg-raised"
                >
                  <span className="relative block aspect-video overflow-hidden bg-raised">
                    <TileMedia
                      image={cover}
                      video={loop}
                      poster={cover}
                      className="transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="flex flex-1 flex-col gap-1.5 p-4">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <ModelGlyph model={lead} className="size-4" />
                        <span className="truncate text-[15px] font-semibold text-foreground">
                          {lead.family}
                        </span>
                      </span>
                      <SurfaceChip surface={lead.surface} />
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">
                      {lead.bestFor ?? lead.description}
                    </span>
                    <span className="mt-auto pt-1 text-xs text-muted-foreground">
                      {count} {count === 1 ? "model" : "models"} · starts with{" "}
                      {lead.label}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ScrollRow>
      </section>

      {/* ── Community ────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="community-title"
        className="mx-auto w-full max-w-[1320px] px-4"
      >
        <SectionHeader
          id="community-title"
          title="Community"
          description="Fresh from creators who chose to publish. Open any piece to see its prompt and recreate it."
          action={
            community.items.length > 0 ? (
              <Link
                href="/community"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-surface px-4 text-sm font-medium transition-colors hover:bg-raised"
              >
                Explore community{" "}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            ) : null
          }
        />
        {community.items.length >= 8 ? (
          <FadeClamp
            href="/community"
            label="Explore community"
            className="max-h-[720px] md:max-h-[900px]"
          >
            <CommunityWall items={community.items} columns={4} eagerCount={0} />
          </FadeClamp>
        ) : community.items.length > 0 ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full">
              <CommunityWall
                items={community.items}
                columns={4}
                eagerCount={0}
              />
            </div>
            <ViewAllPill href="/community">Explore community</ViewAllPill>
          </div>
        ) : (
          <EmptyCard
            headingLevel={3}
            icon={<Users className="size-5" aria-hidden />}
            title={
              community.failed
                ? "The community wall is resting"
                : "The wall is waiting for you"
            }
            body={
              community.failed
                ? "We couldn't load published work right now. Check back in a minute."
                : "Nothing has been published yet. Open any finished generation in your library and choose Publish to feature it here."
            }
            action={
              <Link
                href="/image"
                className="btn-keycap inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold"
              >
                <Sparkles className="size-4" aria-hidden /> Start a shoot
              </Link>
            }
          />
        )}
      </section>

      {/* ── Closing banner ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-title"
        className="mx-auto w-full max-w-[1320px] px-4"
      >
        <div className="grid min-h-[360px] items-center gap-8 overflow-hidden rounded-[28px] border border-white/10 bg-panel p-6 md:grid-cols-[1fr_0.85fr] md:p-12">
          <div className="flex flex-col items-start gap-5">
            <p className="font-mono text-xs tracking-[0.14em] text-forest-soft">
              Ready for your next product drop?
            </p>
            <h2
              id="cta-title"
              className="font-display max-w-[600px] text-[38px] leading-[0.98] text-foreground md:text-[56px]"
            >
              Make the asset set. Keep the brand consistent.
            </h2>
            <p className="max-w-[440px] text-sm leading-6 text-muted-foreground md:text-base">
              Start from one product, build a library of useful variations, then
              bring the finished work into your store.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/image"
                className="btn-keycap inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold"
              >
                <Sparkles className="size-4" aria-hidden /> Start a product set
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-surface px-6 text-base font-medium transition-colors hover:bg-raised"
              >
                See pricing
              </Link>
            </div>
          </div>
          <img
            src={HERO.mark}
            alt="Product campaign art direction example"
            width={1200}
            height={675}
            loading="lazy"
            decoding="async"
            className="h-64 w-full rounded-[22px] object-cover md:h-[300px]"
          />
        </div>
      </section>
    </div>
  )
}
