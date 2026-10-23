import "server-only"

import { ObjectId } from "mongodb"

import CreditsAddedEmail, { creditsAddedText } from "@/emails/credits-added"
import { BRAND } from "@/lib/brand"
import { collections } from "@/lib/db/collections"
import { sendEmail } from "@/lib/email/send"
import { env } from "@/lib/env"

import {
  getBachsSubscription,
  getCheckoutSession,
  planForProductId,
  type BachsEvent,
} from "./bachs"
import { grantCredits, isDuplicateKey, totalCredits } from "./ledger"
import { planOf } from "./plans"
import { applyPaidInvoice, endSubscription } from "./subscriptions"

/**
 * Bachs webhook events → credits. Delivery is at-least-once and events may
 * arrive out of order (/guides/webhooks/overview): every grant is keyed on a
 * Bachs resource id in the ledger, the bachs_events collection skips events
 * already processed, and subscription updates compare event timestamps
 * before writing. Webhook payloads themselves are untrusted — anything that
 * grants or cuts credits is re-read from the platform API first.
 *
 * Event payload shapes come from the documented events:
 * /guides/webhooks/events/{collection-succeeded,invoice-paid,refund-paid}
 * and the subscription object fields shown in
 * /build/use-cases/saas-subscriptions.
 */
export async function handleBachsEvent(
  event: BachsEvent
): Promise<"processed" | "duplicate" | "ignored"> {
  const { bachsEvents } = await collections()
  if (await bachsEvents.findOne({ _id: event.id })) return "duplicate"
  const handled = await dispatch(event)
  try {
    await bachsEvents.insertOne({
      _id: event.id,
      type: event.type,
      processedAt: new Date(),
    })
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
  }
  return handled ? "processed" : "ignored"
}

/** `collection.succeeded` — statuses the docs define for a collected payment. */
const COLLECTED_STATUSES = new Set(["SUCCEEDED", "ACCEPTED", "OVERPAID"])

async function dispatch(event: BachsEvent): Promise<boolean> {
  const data = (event.data ?? {}) as Record<string, unknown>
  switch (event.type) {
    case "collection.succeeded":
      await onCollectionSucceeded(data as CollectionPayload)
      return true
    case "invoice.paid":
      await onInvoicePaid(data as InvoicePayload)
      return true
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await onSubscriptionChanged(data as SubscriptionPayload, event)
      return true
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(data as SubscriptionPayload)
      return true
    case "refund.paid":
      await onRefundPaid(data as RefundPayload)
      return true
    default:
      return false
  }
}

/* ── Payload views (lenient: unknown fields are ignored per the docs) ── */

interface CollectionPayload {
  charge_id?: string | null
  checkout_id?: string | null
  status?: string
  /** Decimal string at the currency's precision ("19.00"). */
  amount?: string
  currency?: string
  customer?: { id?: string; email?: string }
  metadata?: Record<string, string>
}

interface InvoicePayload {
  invoice_id?: string
  subscription?: { subscription_id?: string } | null
  customer?: { customer_id?: string }
  period_end?: string
  metadata?: Record<string, string>
}

/** Fields shown as `sub.*` in /build/use-cases/saas-subscriptions. */
interface SubscriptionPayload {
  subscription_id?: string
  customer?: { customer_id?: string }
  product_id?: string
  status?: string
  metadata?: Record<string, string>
  current_period_end?: string
  cancel_at_period_end?: boolean
}

interface RefundPayload {
  refund_id?: string
  charge_id?: string | null
  requested_amount?: string
  refunded_amount?: string
  reference?: string | null
  customer?: { customer_id?: string }
}

async function userFor(input: {
  userId?: string | null
  customerId?: string
}): Promise<ObjectId | undefined> {
  const { users } = await collections()
  if (input.userId && ObjectId.isValid(input.userId)) {
    const byId = await users.findOne(
      { _id: new ObjectId(input.userId) },
      { projection: { _id: 1 } }
    )
    if (byId) return byId._id
  }
  if (input.customerId) {
    const byCustomer = await users.findOne(
      { bachsCustomerId: input.customerId },
      { projection: { _id: 1 } }
    )
    if (byCustomer) return byCustomer._id
  }
  return undefined
}

async function setCustomerId(userId: ObjectId, customerId: string) {
  const { users } = await collections()
  await users.updateOne(
    { _id: userId, bachsCustomerId: { $exists: false } },
    { $set: { bachsCustomerId: customerId } }
  )
}

/** Bachs money is a decimal string at the currency's precision ("19.00"). */
function formatAmount(
  amount: string | undefined,
  currency: string | undefined
): string {
  const value = Number(amount)
  if (!amount || !Number.isFinite(value)) return "your purchase"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "zar").toUpperCase(),
  }).format(value)
}

/**
 * A payment was collected. Top-ups grant here (never from invoice.paid,
 * which also fires for one-off charges); subscription checkouts flow through
 * customer.subscription.* / invoice.paid instead.
 */
async function onCollectionSucceeded(data: CollectionPayload) {
  const { users } = await collections()
  // data.metadata mirrors the checkout metadata; if it is missing, re-read
  // the checkout session from the API (payloads are untrusted).
  let metadata = data.metadata
  let customerId = data.customer?.id
  if (!metadata?.user_id && data.checkout_id) {
    const session = await getCheckoutSession(data.checkout_id)
    metadata = session.metadata ?? metadata
    customerId = customerId ?? session.customer?.customer_id
  }
  const userId = await userFor({
    userId: metadata?.user_id,
    customerId,
  })
  if (!userId) {
    console.error(
      `[bachs] collection ${data.charge_id ?? data.checkout_id} has no matching user`
    )
    return
  }
  if (customerId) await setCustomerId(userId, customerId)
  if (metadata?.kind !== "topup") return
  if (!COLLECTED_STATUSES.has((data.status ?? "").toUpperCase())) {
    console.error(
      `[bachs] collection ${data.charge_id} has unexpected status ${data.status}`
    )
    return
  }
  const credits = Number(metadata.credits)
  if (!Number.isInteger(credits) || credits <= 0) {
    console.error(`[bachs] collection ${data.charge_id} has no credit amount`)
    return
  }
  const result = await grantCredits({
    userId,
    bucket: "topup",
    amount: credits,
    reason: "topup_purchase",
    refType: "checkout",
    refId: data.checkout_id ?? data.charge_id ?? "unknown",
    note: metadata.pack ? `Top-up: ${metadata.pack}` : "Top-up",
  })
  if (!result.applied) return
  const user = await users.findOne({ _id: userId })
  if (user?.email) {
    const amountLabel = formatAmount(data.amount, data.currency)
    await sendEmail({
      to: user.email,
      subject: `✦ ${credits.toLocaleString("en-US")} credits added`,
      react: CreditsAddedEmail({
        brand: BRAND.name,
        credits,
        balance: totalCredits(result.balance),
        amountLabel,
        appUrl: env().APP_URL,
      }),
      text: creditsAddedText({
        brand: BRAND.name,
        credits,
        balance: totalCredits(result.balance),
        amountLabel,
        appUrl: env().APP_URL,
      }),
    }).catch((error) => console.error("[bachs] receipt email failed", error))
  }
}

/**
 * A subscription invoice was paid: reset the plan credits. One-off charges
 * also emit invoice.paid — they were already granted by collection.succeeded,
 * so only invoices attached to a subscription are honoured here.
 */
async function onInvoicePaid(data: InvoicePayload) {
  const subscriptionId = data.subscription?.subscription_id
  if (!data.invoice_id || !subscriptionId) return
  const subscription = await getBachsSubscription(subscriptionId)
  const mapped = subscription.product_id
    ? planForProductId(subscription.product_id)
    : undefined
  if (!mapped) {
    console.error(
      `[bachs] invoice ${data.invoice_id}: unknown product on ${subscriptionId}`
    )
    return
  }
  const userId = await userFor({
    userId: subscription.metadata?.user_id,
    customerId:
      subscription.customer?.customer_id ?? data.customer?.customer_id,
  })
  if (!userId) {
    console.error(`[bachs] invoice ${data.invoice_id} has no matching user`)
    return
  }
  const customerId =
    subscription.customer?.customer_id ?? data.customer?.customer_id
  if (customerId) await setCustomerId(userId, customerId)
  // Late renewals can miss current_period_end; keep the month we are granting.
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : new Date(Date.now() + 30 * 24 * 60 * 60_000)
  await applyPaidInvoice({
    userId,
    invoiceId: data.invoice_id,
    plan: mapped.plan,
    interval: mapped.interval,
    subscriptionId,
    periodEnd: Number.isNaN(periodEnd.getTime())
      ? new Date(Date.now() + 30 * 24 * 60 * 60_000)
      : periodEnd,
  })
}

const ACTIVE_STATUSES = new Set(["active", "trialing"])

async function onSubscriptionChanged(
  subscription: SubscriptionPayload,
  event: BachsEvent
) {
  const subscriptionId = subscription.subscription_id
  if (!subscriptionId) return
  const userId = await userFor({
    userId: subscription.metadata?.user_id,
    customerId: subscription.customer?.customer_id,
  })
  if (!userId) return
  const customerId = subscription.customer?.customer_id
  if (customerId) await setCustomerId(userId, customerId)
  const { users } = await collections()
  const at = event.created_at ? new Date(event.created_at) : new Date()
  const account = await users.findOne(
    { _id: userId },
    { projection: { planStatusAt: 1 } }
  )
  // Deliveries can arrive out of order; drop stale ones before overwriting.
  if (account?.planStatusAt && account.planStatusAt >= at) return
  const mapped = subscription.product_id
    ? planForProductId(subscription.product_id)
    : undefined
  const active = ACTIVE_STATUSES.has(subscription.status ?? "")
  await users.updateOne(
    { _id: userId },
    {
      $set: {
        planStatus: subscription.cancel_at_period_end
          ? "canceling"
          : (subscription.status ?? "active"),
        planStatusAt: at,
        bachsSubscriptionId: subscriptionId,
        ...(subscription.current_period_end &&
        !Number.isNaN(new Date(subscription.current_period_end).getTime())
          ? {
              planRenewsAt: new Date(subscription.current_period_end),
            }
          : {}),
        // Plan changes take effect once paid (invoice.paid resets credits);
        // a lapsed subscription keeps its credits until it is deleted.
        ...(active && mapped
          ? { plan: mapped.plan, planInterval: mapped.interval }
          : {}),
      },
    }
  )
}

async function onSubscriptionDeleted(subscription: SubscriptionPayload) {
  const subscriptionId = subscription.subscription_id
  if (!subscriptionId) return
  const userId = await userFor({
    userId: subscription.metadata?.user_id,
    customerId: subscription.customer?.customer_id,
  })
  if (!userId) return
  await endSubscription(userId, subscriptionId)
}

/**
 * A refund was paid out: take back the refunded share of the top-up's credits
 * (never below zero). If some credits were already spent, the account is
 * flagged for admin review. Refunds issued from the Bachs dashboard must set
 * `reference` to the top-up's checkout session id (chk_…) so credits can be
 * matched back — see docs/runbook.md; anything else is flagged for review.
 */
async function onRefundPaid(data: RefundPayload) {
  const refunded = Number(data.refunded_amount)
  const requested = Number(data.requested_amount)
  if (
    !Number.isFinite(refunded) ||
    !Number.isFinite(requested) ||
    refunded <= 0 ||
    requested <= 0
  )
    return
  const { users } = await collections()
  const reference = data.reference ?? ""
  let metadata: Record<string, string> | undefined
  let customerId = data.customer?.customer_id
  if (reference.startsWith("chk_")) {
    let session: Awaited<ReturnType<typeof getCheckoutSession>>
    try {
      session = await getCheckoutSession(reference)
    } catch (error) {
      console.error(`[bachs] refund: checkout ${reference} unreadable`, error)
      session = { checkout_id: reference }
    }
    metadata = session.metadata
    customerId = customerId ?? session.customer?.customer_id
  }
  const userId = await userFor({ userId: metadata?.user_id, customerId })
  if (!userId) {
    console.error(`[bachs] refund ${data.refund_id} has no matching user`)
    return
  }
  if (!metadata || metadata.kind !== "topup") {
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          billingFlag: {
            reason: `Charge ${data.charge_id ?? data.refund_id} was refunded; review credits manually.`,
            at: new Date(),
          },
        },
      }
    )
    return
  }
  const granted = Number(metadata.credits ?? 0)
  const share = Math.min(1, refunded / requested)
  const clawback = Math.floor(granted * share)
  if (clawback <= 0) return
  const result = await grantCredits({
    userId,
    bucket: "topup",
    amount: -clawback,
    clampAtZero: true,
    reason: "bachs_refund",
    refType: "charge",
    refId: `${data.charge_id ?? data.refund_id}:${data.refunded_amount}`,
    note: `Refund of ${reference || data.refund_id}`,
  })
  if (result.applied && -result.delta < clawback)
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          billingFlag: {
            reason: `Refund ${data.refund_id}: ${clawback - -result.delta} credits were already spent.`,
            at: new Date(),
          },
        },
      }
    )
}

export { planOf }
