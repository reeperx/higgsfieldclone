import Link from "next/link"

import { BRAND } from "@/lib/brand"
import { cn } from "@/lib/utils"

/** A parcel mark, drawn to stay legible down to the favicon size. */
export function LogoMark({
  className,
  inverted = false,
}: {
  className?: string
  /** On dark surfaces: ink tile with sand glyph. */
  inverted?: boolean
}) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect
        width="32"
        height="32"
        rx="9"
        fill={inverted ? "#17231D" : "#24543F"}
      />
      <path
        d="m7.5 11.5 8.5-4.5 8.5 4.5v9L16 25l-8.5-4.5z"
        fill="none"
        stroke={inverted ? "#D8B26E" : "#F2F4EC"}
        strokeWidth="2"
      />
      <path
        d="m8 12 8 4.5 8-4.5M16 17v7"
        stroke="#F2F4EC"
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
