import Link from "next/link"

import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

/** A product label motif, drawn to stay legible down to the favicon size. */
export function LogoMark({
  className,
  inverted = false,
}: {
  className?: string
  /** On terracotta surfaces: ink tile with paper glyph. */
  inverted?: boolean
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill={inverted ? "#25231F" : "#B94C32"} />
      <path
        d="M8 8h16v16H8z"
        fill="none"
        stroke={inverted ? "#F4F0E8" : "#FFFDF8"}
        strokeWidth="2"
      />
      <path
        d="M12 14h8M12 18h5"
        stroke={inverted ? "#F4F0E8" : "#FFFDF8"}
        strokeLinecap="round"
        strokeWidth="2"
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
      {/* Keep the lowercase wordmark distinct from the editorial display face. */}
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
