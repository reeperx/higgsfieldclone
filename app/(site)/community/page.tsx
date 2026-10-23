import type { Metadata } from "next"

import { Atmosphere } from "@/components/marketing/atmosphere"
import { CommunityFeed } from "@/components/marketing/community-feed"
import { loadPublic } from "@/components/marketing/data"

export const metadata: Metadata = {
  title: "Community",
  description:
    "Images and videos published by creators. Open any piece to see the prompt, model and settings, then recreate it.",
}

export default async function CommunityPage() {
  const page = await loadPublic({ limit: 24 })
  return (
    <div className="relative isolate">
      <Atmosphere glow="top" className="-z-10 h-[420px]" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-10 md:px-12 md:pt-14">
        <header className="flex flex-col gap-3 border-b border-black/10 pb-7">
          <p className="font-mono text-xs tracking-[0.14em] text-[#a63f2b]">
            THE VENDO WORKBOOK / SHARED SHOOTS
          </p>
          <h1 className="font-display text-[44px] leading-none md:text-[64px]">
            Work worth showing.
          </h1>
          <p className="max-w-[620px] text-sm leading-6 text-muted-foreground md:text-base">
            Product campaigns from the community. Open a shoot to see how it
            was made, then adapt the approach for your own catalogue.
          </p>
        </header>
        <CommunityFeed
          initial={page.items}
          initialCursor={page.nextCursor}
          initialError={page.failed}
        />
      </div>
    </div>
  )
}
