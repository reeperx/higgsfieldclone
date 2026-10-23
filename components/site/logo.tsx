import Link from "next/link"

import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

/**
 * Vendo mark: a sand tile carrying a soft price-tag glyph and a four-point
 * sparkle — "products, priced, made intelligent". Drawn to stay legible down to
 * a 16 px favicon; glyph colour is the warm ink the wordmark is set in.
 */
export function LogoMark({
  className,
  inverted = false,
}: {
  className?: string
  /** On sand surfaces: ink tile with sand glyph. */
  inverted?: boolean
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill={inverted ? "#17130B" : "#D8B26E"} />
      <g transform="rotate(-12 14 17.5)">
        <rect
          x="6"
          y="12"
          width="15.5"
          height="11.5"
          rx="3.6"
          fill={inverted ? "#D8B26E" : "#17130B"}
        />
        <circle cx="10" cy="15.1" r="1.5" fill={inverted ? "#17130B" : "#D8B26E"} />
      </g>
      <path
        d="M24.2 4l1.15 3.05L28.4 8.2l-3.05 1.15L24.2 12.4l-1.15-3.05L20 8.2l3.05-1.15L24.2 4z"
        fill={inverted ? "#D8B26E" : "#17130B"}
      />
    </svg>
  )
}

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={cn("flex shrink-0 items-center gap-2", className)}
    >
      <LogoMark className={compact ? "size-6" : "size-8"} />
      {/* Calm lowercase wordmark — the display face's uppercase plays no part here. */}
      <span
        className={cn(
          "font-heading font-bold tracking-[-0.03em] text-foreground",
          compact ? "text-base" : "text-lg"
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  )
}
