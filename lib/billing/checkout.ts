import "server-only"

import { randomUUID } from "node:crypto"

import { z } from "zod"

import { UserFacingError } from "@/lib/errors"
import type { SessionUser } from "@/lib/auth/session"
import { collections } from "@/lib/db/collections"
import { env } from "@/lib/env"
import { enforceRateLimit } from "@/lib/rate-limit"

import { planOf, TOPUPS, topupCredits, type TopupId } from "./plans"
import {
  createBachsSession,
  createCustomer,
  createPortalSession as createBachsPortal,
  planProductId,
  topupProductId,
} from "./bachs"

export const checkoutSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("plan"),
    plan: z.enum(["starter", "plus", "ultra"]),
    interval: z.enum(["month", "year"]),
  }),
  z.object({
    kind: z.literal("topup"),
    pack: z.enum(["small", "medium", "large"]),
  }),
])

/** Bachs customer, created lazily at first checkout (never at sign-up). */
async function customerFor(user: SessionUser): Promise<string> {
  const { users } = await collections()
  const account = await users.findOne({ _id: user.objectId })
  if (!account) throw new UserFacingError("Account not found.")
  if (account.bachsCustomerId) return account.bachsCustomerId
  const customer = await createCustomer({
    email: account.email,
    metadata: { user_id: user.id },
    idempotencyKey: `customer:${user.id}`,
  })
  const updated = await users.findOneAndUpdate(
    { _id: user.objectId, bachsCustomerId: { $exists: false } },
    { $set: { bachsCustomerId: customer.customer_id } },
    { returnDocument: "after" }
  )
  return (
    updated?.bachsCustomerId ??
    (await users.findOne({ _id: user.objectId }))?.bachsCustomerId ??
    customer.customer_id
  )
}

/**
 * Bachs checkout redirects must be public HTTPS (localhost success_url is
 * refused — /guides/checkout/checkout-sessions), so local development omits
 * them; Bachs then shows its own completion page linking back to the app.
 */
function checkoutUrls(): { success_url?: string; cancel_url?: string } {
  const appUrl = env().APP_URL.replace(/\/$/, "")
  if (!/^https:\/\//.test(appUrl) || /\/\/(localhost|127\.0\.0\.1)/.test(appUrl))
    return {}
  return {
    success_url: `${appUrl}/account/billing?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=canceled`,
  }
}

export async function createCheckoutSession(
  user: SessionUser,
  raw: unknown
): Promise<{ url: string }> {
  const input = checkoutSchema.parse(raw)
  await enforceRateLimit(
    `checkout:${user.id}`,
    10,
    60 * 10,
    "Too many checkout attempts. Try again in a few minutes."
  )
  const { users } = await collections()
  const account = await users.findOne({ _id: user.objectId })
  if (!account) throw new UserFacingError("Account not found.")
  const customer = await customerFor(user)

  if (input.kind === "plan") {
    // Existing subscribers change plans in the Bachs customer portal.
    if (account.bachsSubscriptionId && account.plan !== "free")
      return createPortalSession(user)
    const productId = planProductId(input.plan, input.interval)
    if (!productId)
      throw new UserFacingError(
        "This plan isn't available for purchase yet.",
        "PRICE_MISSING"
      )
    const session = await createBachsSession({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { customer_id: customer },
      billing_currency: "ZAR",
      metadata: {
        user_id: user.id,
        kind: "plan",
        plan: input.plan,
        interval: input.interval,
      },
      ...checkoutUrls(),
      idempotencyKey: `checkout:${user.id}:plan:${input.plan}:${input.interval}:${randomUUID()}`,
    })
    if (!session.checkout_url)
      throw new UserFacingError("Could not start checkout.")
    return { url: session.checkout_url }
  }

  const pack = TOPUPS[input.pack as TopupId]
  const productId = topupProductId(pack.id)
  if (!productId)
    throw new UserFacingError(
      "Top-ups aren't available for purchase yet.",
      "PRICE_MISSING"
    )
  // The credit amount is fixed now (plan bonus included) and granted by the webhook.
  const credits = topupCredits(pack, planOf(account.plan))
  const session = await createBachsSession({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { customer_id: customer },
    billing_currency: "ZAR",
    metadata: {
      user_id: user.id,
      kind: "topup",
      pack: pack.id,
      credits: String(credits),
    },
    ...checkoutUrls(),
    idempotencyKey: `checkout:${user.id}:topup:${pack.id}:${randomUUID()}`,
  })
  if (!session.checkout_url)
    throw new UserFacingError("Could not start checkout.")
  return { url: session.checkout_url }
}

export async function createPortalSession(
  user: SessionUser
): Promise<{ url: string }> {
  await enforceRateLimit(
    `portal:${user.id}`,
    10,
    60 * 10,
    "Too many attempts. Try again in a few minutes."
  )
  const { users } = await collections()
  const account = await users.findOne({ _id: user.objectId })
  if (!account?.bachsCustomerId)
    throw new UserFacingError(
      "You don't have a billing account yet. Choose a plan first.",
      "NO_CUSTOMER"
    )
  const session = await createBachsPortal({
    customer_id: account.bachsCustomerId,
  })
  if (!session.url)
    throw new UserFacingError("Could not open the billing portal.")
  return { url: session.url }
}
