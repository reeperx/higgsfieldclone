import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { UserFacingError } from "@/lib/errors"
import { env } from "@/lib/env"

import {
  PLANS,
  TOPUPS,
  type BillingInterval,
  type PlanId,
  type TopupId,
} from "./plans"

/**
 * Bachs REST client — a thin fetch wrapper, like the Higgsfield client (no
 * SDK, matching the repo's restraint). Bachs docs (https://docs.bachs.io):
 * - Conventions & SaaS pattern: /build/use-cases/saas-subscriptions
 * - Checkout sessions:         /guides/checkout/checkout-sessions
 * - Customers:                 /guides/customers
 * - Webhooks and signatures:   /guides/webhooks/overview
 * From the docs: money is a decimal string at the currency's precision
 * ("29.00", never minor units); ids carry prefixes (cust_, prod_, sub_,
 * chk_, inv_, ref_); POST/PATCH carry an Idempotency-Key, which makes the
 * network retries below safe.
 */

function paymentsNotConfigured(): UserFacingError {
  return new UserFacingError(
    "Payments aren't configured on this server yet.",
    "BILLING_DISABLED"
  )
}

export function billingEnabled(): boolean {
  return Boolean(env().BACHS_SECRET_KEY)
}

const SAFE_RETRY = new Set([429, 500, 502, 503, 504])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface BachsOptions {
  idempotencyKey?: string
  /** Total retry budget; requests are safe to repeat under one key. */
  deadlineMs?: number
}

/** GET/POST against the Bachs API with bearer auth and retry-once semantics. */
async function bachsFetch<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  options: BachsOptions = {}
): Promise<T> {
  const config = env()
  if (!config.BACHS_SECRET_KEY) throw paymentsNotConfigured()
  const base = (config.BACHS_API_URL ?? "https://api.bachs.io").replace(
    /\/$/,
    ""
  )
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.BACHS_SECRET_KEY}`,
  }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (options.idempotencyKey)
    headers["Idempotency-Key"] = options.idempotencyKey

  const deadline = Date.now() + (options.deadlineMs ?? 15_000)
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0) await sleep(Math.random() * 400 * 2 ** attempt)
    let response: Response
    try {
      response = await fetch(`${base}${path}`, {
        method,
        headers,
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    } catch {
      if (Date.now() >= deadline)
        throw new UserFacingError(
          "The payment provider is unreachable. Try again in a minute.",
          "PROVIDER_ERROR"
        )
      continue
    }
    if (response.ok) return (await response.json()) as T
    if (SAFE_RETRY.has(response.status) && Date.now() < deadline) continue
    const snippet = (await response.text()).slice(0, 300)
    console.error(`[bachs] ${method} ${path} → ${response.status} ${snippet}`)
    throw new UserFacingError(
      "The payment provider rejected the request. Try again in a minute.",
      "PROVIDER_ERROR"
    )
  }
}

/* ── Product ids (Bachs products are created in the dashboard; ours map env ids) ── */

function priceEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

export function planProductId(
  plan: PlanId,
  interval: BillingInterval
): string | undefined {
  const names = PLANS[plan].priceEnv
  return names
    ? priceEnv(interval === "year" ? names.year : names.month)
    : undefined
}

export function topupProductId(pack: TopupId): string | undefined {
  return priceEnv(TOPUPS[pack].priceEnv)
}

/** Reverse lookup from a Bachs product id to our plan + interval. */
export function planForProductId(
  productId: string
): { plan: PlanId; interval: BillingInterval } | undefined {
  for (const plan of Object.values(PLANS)) {
    if (!plan.priceEnv) continue
    if (priceEnv(plan.priceEnv.month) === productId)
      return { plan: plan.id, interval: "month" }
    if (priceEnv(plan.priceEnv.year) === productId)
      return { plan: plan.id, interval: "year" }
  }
  return undefined
}

/* ── API calls (fields per the guides listed above; unknown fields ignored) ── */

export interface BachsCustomer {
  customer_id: string
}

export function createCustomer(input: {
  email: string
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<BachsCustomer> {
  return bachsFetch("POST", "/v1/customers", input, {
    idempotencyKey: input.idempotencyKey,
  })
}

export interface BachsCheckoutSession {
  checkout_id: string
  checkout_url?: string
  status?: string
  expires_at?: string
  customer?: { customer_id?: string }
  metadata?: Record<string, string>
}

export function createBachsSession(input: {
  product_cart: { product_id: string; quantity: number }[]
  customer: { customer_id: string }
  billing_currency: string
  reference?: string
  metadata?: Record<string, string>
  success_url?: string
  cancel_url?: string
  idempotencyKey?: string
}): Promise<BachsCheckoutSession> {
  return bachsFetch("POST", "/v1/checkout-sessions", input, {
    idempotencyKey: input.idempotencyKey,
  })
}

/** Re-fetch a checkout session (webhook payloads are untrusted). */
export function getCheckoutSession(
  checkoutId: string
): Promise<BachsCheckoutSession> {
  return bachsFetch(
    "GET",
    `/v1/checkout-sessions/${encodeURIComponent(checkoutId)}`,
    undefined
  )
}

export interface BachsSubscription {
  subscription_id: string
  customer?: { customer_id?: string }
  product_id?: string
  status?: string
  metadata?: Record<string, string>
  current_period_end?: string
  cancel_at_period_end?: boolean
}

/** Re-fetch a subscription (webhook payloads are untrusted). */
export function getBachsSubscription(
  subscriptionId: string
): Promise<BachsSubscription> {
  return bachsFetch(
    "GET",
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    undefined
  )
}

export function createPortalSession(input: {
  customer_id: string
}): Promise<{ url?: string }> {
  return bachsFetch(
    "POST",
    `/v1/customers/${encodeURIComponent(input.customer_id)}/portal-sessions`,
    {}
  )
}

/* ── Webhook signature verification (/guides/webhooks/overview) ── */

/**
 * `X-Bachs-Signature-V2: t=<unix seconds>,v1=<hex>` — HMAC-SHA256 over
 * `{t}.{raw_body}`, 300 s tolerance, any v1 candidate may match (and it
 * must be constant-time). Legacy fallback: `X-Bachs-Timestamp` +
 * `X-Bachs-Signature` with the same digest. Returns the parsed event, or
 * undefined when nothing verifies.
 */
export interface BachsEvent {
  id: string
  type: string
  created_at?: string
  data?: unknown
}

const SIGNATURE_TOLERANCE_MS = 5 * 60_000

function safeEqual(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(given, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}

function digest(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex")
}

export function verifyBachsWebhook(input: {
  body: string
  v2: string | null
  legacySignature: string | null
  legacyTimestamp: string | null
  secret: string
}): BachsEvent | undefined {
  const candidates: { timestamp: string; signatures: string[] }[] = []
  if (input.v2) {
    const parts = new Map<string, string[]>()
    for (const part of input.v2.split(",")) {
      const eq = part.indexOf("=")
      if (eq === -1) continue
      const key = part.slice(0, eq).trim()
      const value = part.slice(eq + 1).trim()
      parts.set(key, [...(parts.get(key) ?? []), value])
    }
    const [timestamp] = parts.get("t") ?? []
    const signatures = (parts.get("v1") ?? []).filter(Boolean)
    if (timestamp && signatures.length)
      candidates.push({ timestamp, signatures })
  }
  if (input.legacySignature && input.legacyTimestamp) {
    candidates.push({
      timestamp: input.legacyTimestamp,
      signatures: [input.legacySignature],
    })
  }

  for (const { timestamp, signatures } of candidates) {
    const sentAt = Number(timestamp)
    if (
      !Number.isFinite(sentAt) ||
      Math.abs(Date.now() - sentAt * 1000) > SIGNATURE_TOLERANCE_MS
    )
      continue
    const expected = digest(input.secret, timestamp, input.body)
    if (signatures.some((given) => safeEqual(expected, given.toLowerCase()))) {
      try {
        const parsed = JSON.parse(input.body) as BachsEvent
        if (typeof parsed.id === "string" && typeof parsed.type === "string")
          return parsed
      } catch {
        // fall through — a valid signature over a non-JSON body
      }
      return undefined
    }
  }
  return undefined
}
