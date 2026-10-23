"use client"

import Link from "next/link"

import { BRAND } from "@/lib/brand"

import { LogoMark } from "./logo"

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Create",
    links: [
      { label: "Product photos", href: "/image" },
      { label: "Product video", href: "/video" },
      { label: "AI model shoots", href: "/image?model=soul-2" },
      { label: "Shot presets", href: "/effects" },
    ],
  },
  {
    title: "Video models",
    links: [
      { label: "Seedance 2.5", href: "/video?model=seedance-2.5" },
      { label: "Kling 3.0 Pro", href: "/video?model=kling-3-pro" },
      { label: "Cinema Studio 4.0", href: "/video?model=cinema-studio-4" },
      { label: "Wan 3.0", href: "/video?model=wan-3" },
      { label: "MiniMax H3", href: "/video?model=minimax-h3" },
    ],
  },
  {
    title: "Image models",
    links: [
      { label: "Marketing Studio", href: "/image?model=marketing-image-flare" },
      { label: "Soul 2", href: "/image?model=soul-2" },
      { label: "Ideogram 4.0", href: "/image?model=ideogram-4" },
      { label: "Qwen Image 3", href: "/image?model=qwen-image-3" },
      { label: "Grok Image 2.0", href: "/image?model=grok-image-2" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Community", href: "/community" },
      { label: "Support", href: `mailto:${BRAND.supportEmail}` },
      { label: "Refund policy", href: "/legal/refunds" },
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-24">
      <div className="bg-sand px-6 py-14 text-[#17130b] md:px-12">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.1fr_2fr]">
          <div className="flex flex-col gap-6">
            <LogoMark inverted className="size-10" />
            <p className="font-display text-4xl leading-[0.95] md:text-5xl">
              Shoot every
              <br />
              product yourself
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <p className="text-sm font-medium text-[#17130b]/70">
                  {column.title}
                </p>
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[15px] font-medium hover:underline hover:underline-offset-4"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start justify-between gap-3 px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:px-12">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-4 text-foreground">
          <Link href="/legal/terms" className="hover:text-sand">
            Terms
          </Link>
          <Link href="/legal/refunds" className="hover:text-sand">
            Refunds
          </Link>
          <Link href="/legal/privacy" className="hover:text-sand">
            Privacy
          </Link>
          <Link href="/legal/cookies" className="hover:text-sand">
            Cookies
          </Link>
          <Link href="/legal/acceptable-use" className="hover:text-sand">
            Acceptable use
          </Link>
          <button
            type="button"
            className="hover:text-sand"
            onClick={() =>
              window.dispatchEvent(new Event("vireo:cookie-preferences"))
            }
          >
            Cookie settings
          </button>
        </div>
      </div>
    </footer>
  )
}
