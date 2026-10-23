import { cn } from "@/lib/utils"

const DOTS_MASK =
  "radial-gradient(ellipse 70% 60% at 50% 40%, #000 0%, transparent 75%)"

/** Soft paper grain and warm color wash for editorial section transitions. */
export function Atmosphere({
  className,
  glow = "top",
}: {
  className?: string
  glow?: "top" | "bottom" | "center"
}) {
  const at =
    glow === "top" ? "50% 0%" : glow === "bottom" ? "50% 100%" : "50% 50%"
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(60% 55% at ${at}, rgba(185,76,50,0.10) 0%, rgba(71,107,130,0.04) 45%, transparent 75%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(37,35,31,0.08) 0.7px, transparent 0.7px)",
          backgroundSize: "18px 18px",
          maskImage: DOTS_MASK,
          WebkitMaskImage: DOTS_MASK,
        }}
      />
    </div>
  )
}
