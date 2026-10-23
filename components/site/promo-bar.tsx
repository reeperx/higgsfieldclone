"use client"

import Link from "next/link"
import { Tag, X } from "lucide-react"

import { BRAND } from "@/lib/brand"
import { useLocalFlag } from "@/lib/studio/local-flag"

const KEY = `vireo.promo.dismissed:${BRAND.promo}`

/** Optional dismissible promo bar; copy comes from NEXT_PUBLIC_PROMO_BAR. */
export function PromoBar() {
  const [dismissed, setDismissed, hydrated] = useLocalFlag(KEY)
  if (!BRAND.promo || !hydrated || dismissed === "1") return null
  return (
    <div className="relative flex min-h-10 items-center justify-center gap-3 border-b border-white/10 bg-panel px-10 py-2 text-center text-sm font-medium text-foreground">
      <Tag className="hidden size-4 sm:block" aria-hidden />
      <span>{BRAND.promo}</span>
      <Link
        href={BRAND.promoHref}
        className="rounded-full bg-[#31583e] px-3 py-1 text-xs font-semibold text-white hover:bg-[#3d6b4b]"
      >
        See offer
      </Link>
      <button
        type="button"
        aria-label="Dismiss promotion"
        className="absolute right-2 flex size-7 items-center justify-center rounded-lg hover:bg-white/10"
        onClick={() => setDismissed("1")}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
