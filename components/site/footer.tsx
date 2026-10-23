"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { BRAND } from "@/lib/brand"

import { Logo, LogoMark } from "./logo"

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Make",
    links: [
      { label: "Product photography", href: "/image" },
      { label: "Product films", href: "/video" },
      { label: "Art direction", href: "/effects" },
    ],
  },
  {
    title: "Manage",
    links: [
      { label: "Work gallery", href: "/community" },
      { label: "Plans and credits", href: "/pricing" },
      { label: "Your library", href: "/assets" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: `mailto:${BRAND.supportEmail}` },
      { label: "Terms", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Refunds", href: "/legal/refunds" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="mt-20 px-3 pb-3 md:px-6 md:pb-6">
      <div className="overflow-hidden rounded-[28px] bg-[#14221a] text-[#f2f4ec]">
        <div className="grid gap-12 border-b border-white/10 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start gap-8">
            <LogoMark inverted className="size-10" />
            <div className="max-w-[540px]">
              <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-forest-soft">
                YOUR NEXT PRODUCT DROP
              </p>
              <h2 className="mt-3 max-w-[480px] text-4xl leading-[1.02] font-bold tracking-[-0.05em] md:text-6xl">
                Make the whole set. Keep the brand yours.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/65 md:text-base">
                Build listing-ready photos and product films, then keep every
                approved take together in one production space.
              </p>
            </div>
            <Link
              href="/image"
              className="btn-keycap inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition"
            >
              Start a product set <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 content-start gap-x-6 gap-y-10 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="text-xs font-semibold tracking-[0.12em] text-white/45 uppercase">
                  {column.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/80 transition hover:text-forest-soft"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between md:px-10">
          <Logo compact className="[&>span]:text-white/80" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/legal/cookies" className="hover:text-white">
              Cookies
            </Link>
            <Link href="/legal/acceptable-use" className="hover:text-white">
              Acceptable use
            </Link>
            <button
              type="button"
              className="hover:text-white"
              onClick={() =>
                window.dispatchEvent(new Event("vireo:cookie-preferences"))
              }
            >
              Cookie settings
            </button>
            <span>
              © {new Date().getFullYear()} {BRAND.name}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
