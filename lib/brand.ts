/** Public brand constants, safe for client and server. */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Vendo",
  tagline: "Product photos and videos your store can sell with",
  description:
    "Vendo is the AI studio for e-commerce product photography. Studio-grade product shots, lifestyle scenes with AI models, and scroll-stopping product videos — one credit balance, one library.",
  productionUrl: "https://vendo.studio",
  supportEmail: "support@vendo.studio",
  /** Dismissible promo bar above the nav; empty string hides it. */
  promo: process.env.NEXT_PUBLIC_PROMO_BAR ?? "",
  promoHref: process.env.NEXT_PUBLIC_PROMO_HREF ?? "/pricing",
} as const
