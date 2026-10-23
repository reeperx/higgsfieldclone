import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  CirclePlus,
  Film,
  FolderKanban,
  Image as ImageIcon,
  Layers3,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { currentUser } from "@/lib/auth/session"
import { getAccount } from "@/lib/account"
import { getWorkspaceOverview, listProjects } from "@/lib/generations/library"

export const metadata: Metadata = { title: "Workspace" }

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string
  value: number
  note: string
  icon: LucideIcon
}) {
  return (
    <article className="flex min-h-36 flex-col justify-between rounded-2xl border border-white/10 bg-panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-forest-soft" aria-hidden />
      </div>
      <div>
        <p className="font-display text-4xl tabular-nums">
          {value.toLocaleString("en-US")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
    </article>
  )
}

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) redirect("/login?callbackUrl=/dashboard")

  const [account, overview, projects] = await Promise.all([
    getAccount(user.objectId),
    getWorkspaceOverview(user.objectId),
    listProjects(user.objectId),
  ])
  const greeting = account.name?.trim().split(/\s+/)[0] || "creator"

  return (
    <div className="mx-auto flex w-full flex-col gap-8">
      <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.12em] text-forest-soft">
            SELLER WORKSPACE / 30-DAY PULSE
          </p>
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">
            Good to see you, {greeting}.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Your product content desk is ready. Pick up a shoot, build a listing
            set, or check how your latest work is moving.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/assets"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-panel px-4 text-sm font-semibold hover:bg-raised"
          >
            <FolderKanban className="size-4" aria-hidden /> Open library
          </Link>
          <Link
            href="/image"
            className="btn-keycap inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
          >
            <CirclePlus className="size-4" aria-hidden /> New listing set
          </Link>
        </div>
      </header>

      <section
        aria-label="Production overview"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          label="Assets produced"
          value={overview.total}
          note="All shoots in your workspace"
          icon={Layers3}
        />
        <Metric
          label="Finished this month"
          value={overview.completedThisMonth}
          note="Completed in the last 30 days"
          icon={ImageIcon}
        />
        <Metric
          label="In production"
          value={overview.inFlight}
          note="Generations still processing"
          icon={Film}
        />
        <Metric
          label="Active projects"
          value={overview.projectCount}
          note={`${overview.failedThisMonth} failed in the last 30 days`}
          icon={FolderKanban}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-panel">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-5 md:px-6">
            <div>
              <p className="font-mono text-[11px] tracking-[0.12em] text-forest-soft">
                RECENT OUTPUTS
              </p>
              <h2 className="font-display mt-1 text-2xl">
                Latest from the studio
              </h2>
            </div>
            <Link
              href="/assets"
              className="inline-flex items-center gap-1 text-sm font-semibold text-forest-soft hover:underline"
            >
              View library <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {overview.recent.length ? (
            <ul className="divide-y divide-white/10">
              {overview.recent.map((item) => {
                const image = item.outputs.find(
                  (output) => output.kind === "image"
                )
                const firstOutput = item.outputs[0]
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 px-5 py-4 md:px-6"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-raised">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- private media URLs come from the asset library
                        <img
                          src={image.url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : firstOutput?.kind === "video" ? (
                        <Film className="size-5 text-forest-soft" aria-hidden />
                      ) : (
                        <Sparkles
                          className="size-5 text-forest-soft"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {item.prompt || `${item.surface} production`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.modelLabel} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-forest-soft/10 px-2.5 py-1 text-xs font-medium text-forest-soft capitalize">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-3 px-5 py-10 md:px-6">
              <p className="font-display text-xl">
                Your first product shoot starts here.
              </p>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                Create consistent listing photos or place your product in a
                lifestyle scene. Your finished assets will be organized here.
              </p>
              <Link
                href="/image"
                className="btn-keycap inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
              >
                <ImageIcon className="size-4" aria-hidden /> Build product
                photos
              </Link>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-3xl border border-white/10 bg-[#19221a] p-6 text-foreground">
            <p className="font-mono text-[11px] tracking-[0.12em] text-forest-soft">
              CREDIT METER
            </p>
            <p className="font-display mt-5 text-4xl tabular-nums">
              {account.total.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-sm text-white/65">credits ready to use</p>
            <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/75">
              <span>{account.planName} plan</span>
              <span>
                {account.credits.subscription.toLocaleString("en-US")} plan ·{" "}
                {account.credits.topup.toLocaleString("en-US")} top-up
              </span>
            </div>
            <Link
              href="/account/billing"
              className="btn-keycap mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              Manage credits <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>

          <section className="rounded-3xl border border-white/10 bg-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] tracking-[0.12em] text-forest-soft">
                  CAMPAIGN SHELVES
                </p>
                <h2 className="font-display mt-1 text-xl">Projects</h2>
              </div>
              <Link
                href="/assets"
                aria-label="View all projects"
                className="flex size-9 items-center justify-center rounded-full bg-forest-soft/10 text-forest-soft hover:bg-forest-soft/20"
              >
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            {projects.length ? (
              <ul className="mt-4 flex flex-col gap-2">
                {projects.slice(0, 4).map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-raised"
                    >
                      <span className="truncate text-sm font-medium">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {project.generationCount} assets
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Group your listing sets and seasonal campaigns into projects.
                Create a shelf in your library to get started.
              </p>
            )}
          </section>
        </aside>
      </section>
    </div>
  )
}
