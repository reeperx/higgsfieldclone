import { activeSurfaces } from "@/generation/catalog"

export type NavLink = {
  href: string
  label: string
  match: (path: string) => boolean
}

/** Product workflow navigation. Audio appears once an audio model exists. */
export function navLinks(): NavLink[] {
  const surfaces = activeSurfaces()
  const links: NavLink[] = [
    { href: "/", label: "Overview", match: (path) => path === "/" },
    {
      href: "/image",
      label: "Product photos",
      match: (path) => path.startsWith("/image"),
    },
    {
      href: "/video",
      label: "Product video",
      match: (path) => path.startsWith("/video"),
    },
  ]
  if (surfaces.includes("audio"))
    links.push({
      href: "/audio",
      label: "Audio",
      match: (path) => path.startsWith("/audio"),
    })
  links.push(
    {
      href: "/effects",
      label: "Looks",
      match: (path) => path.startsWith("/effects"),
    },
    {
      href: "/community",
      label: "Work gallery",
      match: (path) => path.startsWith("/community") || path.startsWith("/g/"),
    },
    {
      href: "/pricing",
      label: "Pricing",
      match: (path) => path.startsWith("/pricing"),
    }
  )
  return links
}
