/**
 * A local stand-in for the Bachs billing API (docs.bachs.io) for development
 * without a Bachs account. Implements the endpoints our client uses plus a
 * fake hosted checkout and customer portal, and delivers the same signed
 * webhooks the real platform sends.
 *
 *   pnpm mock:bachs                                    # http://localhost:4011
 *   BACHS_API_URL=http://localhost:4011  BACHS_SECRET_KEY=sk_sandbox_mock
 *
 * The mock signs webhooks with BACHS_WEBHOOK_SECRET and posts them to
 * BACHS_WEBHOOK_BASE_URL (default http://localhost:3000/api/webhooks/bachs),
 * reading the rest from .env.local. Product prices are inferred from the
 * BACHS_PRICE_* entries; unknown product ids price at "0.00".
 */
import { createHmac, randomUUID } from "node:crypto"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"

const PORT = Number(process.env.MOCK_BACHS_PORT ?? 4011)
const BASE = `http://localhost:${PORT}`

/** .env.local is read to echo the app's configured product ids. */
const envLocalPath = join(process.cwd(), ".env.local")
const envLocal = existsSync(envLocalPath)
  ? readFileSync(envLocalPath, "utf8")
  : ""

function fromEnvLocal(name: string): string | undefined {
  const line = envLocal
    .split("\n")
    .find((row) => row.startsWith(`${name}=`))
  if (!line) return undefined
  const value = line.slice(name.length + 1).trim()
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value
}

/** Minimal .env.local reader so `pnpm mock:bachs` needs no extra setup. */
function env(): Record<string, string> {
  const values: Record<string, string> = {}
  for (const name of [
    "APP_URL",
    "BACHS_WEBHOOK_SECRET",
    "BACHS_PRICE_STARTER_MONTHLY",
    "BACHS_PRICE_STARTER_ANNUAL",
    "BACHS_PRICE_PLUS_MONTHLY",
    "BACHS_PRICE_PLUS_ANNUAL",
    "BACHS_PRICE_ULTRA_MONTHLY",
    "BACHS_PRICE_ULTRA_ANNUAL",
    "BACHS_PRICE_TOPUP_SMALL",
    "BACHS_PRICE_TOPUP_MEDIUM",
    "BACHS_PRICE_TOPUP_LARGE",
  ]) {
    const fromShell = process.env[name]
    values[name] =
      fromShell === undefined ? fromEnvLocal(name) ?? "" : fromShell
  }
  return values
}

const APP_URL = (env().APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
const WEBHOOK_TARGET =
  process.env.BACHS_WEBHOOK_TARGET ??
  `${APP_URL}/api/webhooks/bachs`
const WEBHOOK_SECRET = env().BACHS_WEBHOOK_SECRET ?? ""
const API_KEY = process.env.MOCK_BACHS_API_KEY ?? "sk_sandbox_mock"

interface Product {
  product_id: string
  name: string
  /** Decimal string at currency precision ("29.00"). */
  amount: string
  currency: string
  /** Recurring products create subscriptions at checkout completion. */
  interval?: "month" | "year"
}

interface CheckoutSession {
  checkout_id: string
  status: "open" | "completed" | "failed"
  products: { product_id: string; quantity: number }[]
  customer: { customer_id?: string; email?: string; name?: string }
  metadata: Record<string, string>
  success_url?: string
  cancel_url?: string
  createdAt: number
  expiresAt: number
}

interface Subscription {
  subscription_id: string
  product_id: string
  customer: { customer_id: string }
  status: "active" | "canceling" | "canceled"
  metadata: Record<string, string>
  current_period_end: string
  cancel_at_period_end: boolean
  interval: "month" | "year"
}

const products = new Map<string, Product>()
const checkouts = new Map<string, CheckoutSession>()
const customers = new Map<string, CheckoutSession["customer"]>()
const subscriptions = new Map<string, Subscription>()

/** Display prices for the product ids the app is configured with. */
const PRICE_HINTS: [RegExp, Product][] = [
  [/STARTER_MONTHLY/, { product_id: "", name: "Starter (monthly)", amount: "199.00", currency: "ZAR", interval: "month" }],
  [/STARTER_ANNUAL/, { product_id: "", name: "Starter (yearly)", amount: "1910.40", currency: "ZAR", interval: "year" }],
  [/PLUS_MONTHLY/, { product_id: "", name: "Plus (monthly)", amount: "549.00", currency: "ZAR", interval: "month" }],
  [/PLUS_ANNUAL/, { product_id: "", name: "Plus (yearly)", amount: "5270.40", currency: "ZAR", interval: "year" }],
  [/ULTRA_MONTHLY/, { product_id: "", name: "Ultra (monthly)", amount: "1399.00", currency: "ZAR", interval: "month" }],
  [/ULTRA_ANNUAL/, { product_id: "", name: "Ultra (yearly)", amount: "13430.40", currency: "ZAR", interval: "year" }],
  [/TOPUP_SMALL/, { product_id: "", name: "Boost", amount: "99.00", currency: "ZAR" }],
  [/TOPUP_MEDIUM/, { product_id: "", name: "Pack", amount: "399.00", currency: "ZAR" }],
  [/TOPUP_LARGE/, { product_id: "", name: "Crate", amount: "899.00", currency: "ZAR" }],
]

function productFor(productId: string): Product {
  let product = products.get(productId)
  if (!product) {
    const key = Object.entries(env()).find(([, id]) => id === productId)?.[0]
    const hit = PRICE_HINTS.find(([pattern]) => pattern.test(key ?? ""))
    product = hit
      ? { ...hit[1], product_id: productId }
      : {
          product_id: productId,
          name: productId,
          amount: "0.00",
          currency: "ZAR",
        }
    if (!hit)
      console.log(
        `[mock-bachs] unknown product ${productId} (price "0.00" — set the matching BACHS_PRICE_* id)`
      )
    products.set(productId, product)
  }
  return product
}

async function deliver(type: string, data: Record<string, unknown>) {
  const timestamp = Math.floor(Date.now() / 1000)
  const id = `evt_${randomUUID().replaceAll("-", "").slice(0, 24)}`
  const body = JSON.stringify({
    id,
    type,
    created_at: new Date().toISOString(),
    organization_id: "acct_mock",
    data,
  })
  const signature = WEBHOOK_SECRET
    ? createHmac("sha256", WEBHOOK_SECRET)
        .update(`${timestamp}.${body}`)
        .digest("hex")
    : ""
  console.log(`[mock-bachs] → ${type} (${WEBHOOK_TARGET})`)
  try {
    await fetch(WEBHOOK_TARGET, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature
          ? { "x-bachs-signature-v2": `t=${timestamp},v1=${signature}` }
          : {}),
      },
      body,
    })
  } catch {
    console.error(`[mock-bachs] delivery failed (${WEBHOOK_TARGET})`)
  }
}

function pay(session: CheckoutSession) {
  if (session.status !== "open") return
  session.status = "completed"
  // Docs allow multiple products per checkout; ours always send one.
  const productId = session.products[0]?.product_id ?? ""
  const product = productFor(productId)
  const chargeId = `ch_${randomUUID().replaceAll("-", "").slice(0, 20)}`
  void deliver("collection.succeeded", {
    charge_id: chargeId,
    checkout_id: session.checkout_id,
    status: "SUCCEEDED",
    amount: product.amount,
    currency: product.currency,
    product_cart: session.products,
    customer: { ...session.customer },
    metadata: session.metadata,
  })
  if (product.interval) {
    const subscription: Subscription = {
      subscription_id: `sub_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
      product_id: product.product_id,
      customer: { customer_id: session.customer.customer_id ?? "cust_mock" },
      status: "active",
      metadata: session.metadata,
      current_period_end: new Date(
        Date.now() +
          (product.interval === "year" ? 365 : 30) * 24 * 60 * 60_000
      ).toISOString(),
      cancel_at_period_end: false,
      interval: product.interval,
    }
    subscriptions.set(subscription.subscription_id, subscription)
    void deliver("customer.subscription.created", asSubscriptionDoc(subscription))
    void deliver("invoice.paid", {
      invoice_id: `inv_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
      subscription: { subscription_id: subscription.subscription_id },
      customer: { customer_id: subscription.customer.customer_id },
      period_start: new Date().toISOString(),
      period_end: subscription.current_period_end,
      metadata: session.metadata,
    })
  }
}

function asSubscriptionDoc(subscription: Subscription): Record<string, unknown> {
  return {
    subscription_id: subscription.subscription_id,
    customer: subscription.customer,
    product_id: subscription.product_id,
    status: subscription.status,
    metadata: subscription.metadata,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }
}

/* ── Fake hosted pages ──────────────────────────────────────────────────── */

const PAGE = (title: string, body: string) => `<doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<style>
  body{background:#0c0f14;color:#e6e8ee;font:16px/1.5 system-ui,sans-serif;
       display:grid;place-items:center;height:100vh;margin:0}
  main{background:#151a22;border:1px solid #263140;border-radius:14px;
       padding:34px 38px;width:340px}
  h1{font-size:18px;margin:0 0 14px}
  p{color:#9aa6ba;margin:0 0 22px}
  button{width:100%;padding:12px;border:0;border-radius:9px;margin:6px 0;
         font:600 15px system-ui;cursor:pointer}
  .pay{background:#c8f04a;color:#10130a}
  .fail{background:#263140;color:#e6e8ee}
  a{color:#c8f04a}
  ul{text-align:left;color:#9aa6ba;font-size:14px}
</style></head><body><main>${body}</main></body></html>`

function checkoutPage(id: string): string {
  const session = checkouts.get(id)
  if (!session) return PAGE("Bachs (mock)", "<h1>Checkout not found</h1>")
  if (session.status !== "open")
    return PAGE(
      "Bachs (mock)",
      `<h1>Checkout ${session.status}</h1><a href="${APP_URL}/account/billing">Return to your studio</a>`
    )
  const product = session.products[0]
    ? productFor(session.products[0].product_id)
    : undefined
  return PAGE(
    "Bachs (mock)",
    `<h1>${product?.name ?? "Product"}</h1>
     <p>R${product?.amount ?? "0.00"} per billing period</p>
     <form method="post" action="${BASE}/checkout/${id}/pay"><button class="pay" type="submit">Pay now</button></form>
     <form method="post" action="${BASE}/checkout/${id}/fail"><button class="fail" type="submit">Simulate a failed payment</button></form>`
  )
}

function portalPage(customerId: string): string {
  const rows = [...subscriptions.values()]
    .filter(
      (subscription) =>
        subscription.customer.customer_id === customerId &&
        subscription.status !== "canceled"
    )
    .map(
      (subscription) =>
        `<li>${productFor(subscription.product_id).name} — ${
          subscription.status
        }, renews until ${subscription.current_period_end.slice(0, 10)}
         <form style="display:inline" method="post"
           action="${BASE}/portal/${customerId}/subscriptions/${subscription.subscription_id}/${
             subscription.cancel_at_period_end ? "resume" : "cancel"
           }">
           <button class="fail" style="width:auto;padding:6px 10px" type="submit">${
             subscription.cancel_at_period_end ? "Resume" : "Cancel"
           }</button></form></li>`
    )
  return PAGE(
    "Bachs customer portal (mock)",
    `<h1>Your billing</h1>
     <ul>${rows.join("") || "<li>No active subscriptions.</li>"}</ul>
     <a href="${APP_URL}/account/billing">Return to your studio</a>`
  )
}

/* ── HTTP server ───────────────────────────────────────────────────────── */

function send(res: ServerResponse, status: number, data?: unknown) {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(data === undefined ? "" : JSON.stringify(data))
}

function html(res: ServerResponse, page: string) {
  res.writeHead(200, { "content-type": "text/html" })
  res.end(page)
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", BASE)
  const method = req.method ?? "GET"
  try {
    // Hosted pages (what a buyer would see).
    const checkoutPageMatch = url.pathname.match(/^\/checkout\/([^/]+)/)
    if (method === "GET" && checkoutPageMatch)
      return html(res, checkoutPage(checkoutPageMatch[1]!))
    const payMatch = url.pathname.match(
      /^\/checkout\/([^/]+)\/(pay|fail)$/
    )
    if (method === "POST" && payMatch) {
      const session = checkouts.get(payMatch[1]!)
      if (!session) return send(res, 404, { detail: "Checkout not found" })
      if (payMatch[2] === "fail") {
        session.status = "failed"
        return html(
          res,
          PAGE(
            "Bachs (mock)",
            "<h1>Payment failed</h1><a href=\"/checkout/" +
              session.checkout_id +
              '">Try again</a>'
          )
        )
      }
      pay(session)
      const destination = `${session.success_url ?? `${APP_URL}/account/billing?checkout=success`}`
      return html(
        res,
        PAGE(
          "Bachs (mock)",
          `<h1>Payment complete</h1><p>Credits land via webhook delivery.</p><a href="${destination}">Return to your studio</a>`
        )
      )
    }
    const portalMatch = url.pathname.match(/^\/portal\/([^/]+)/)
    if (method === "GET" && portalMatch)
      return html(res, portalPage(portalMatch[1]!))
    const subscriptionAction = url.pathname.match(
      /^\/portal\/([^/]+)\/subscriptions\/([^/]+)\/(cancel|resume)$/
    )
    if (method === "POST" && subscriptionAction) {
      const [, customerId, subscriptionId, action] = subscriptionAction
      const subscription = subscriptions.get(subscriptionId!)
      if (!subscription) return send(res, 404, { detail: "No such subscription" })
      subscription.cancel_at_period_end = action === "cancel"
      subscription.status = action === "cancel" ? "canceling" : "active"
      void deliver(
        "customer.subscription.updated",
        asSubscriptionDoc(subscription)
      )
      return html(res, portalPage(customerId!))
    }

    // REST API.
    if (!/^Basic |^Bearer /.test(req.headers.authorization ?? ""))
      return send(res, 401, { detail: "Missing Authorization" })
    if (req.headers.authorization !== `Bearer ${API_KEY}`)
      return send(res, 401, { detail: "Invalid API key" })
    if (method === "POST" && url.pathname === "/v1/checkout-sessions")
      return send(res, 200, await createCheckout(req))
    const sessionGet = url.pathname.match(/^\/v1\/checkout-sessions\/([^/]+)$/)
    if (method === "GET" && sessionGet) {
      const session = checkouts.get(sessionGet[1]!)
      if (!session) return send(res, 404, { detail: "Not found" })
      return send(res, 200, asSessionDoc(session))
    }
    if (method === "POST" && url.pathname === "/v1/customers") {
      const body = JSON.parse((await readBody(req)).toString() || "{}") as {
        email?: string
        name?: string
        metadata?: Record<string, string>
      }
      const customerId = `cust_${randomUUID().replaceAll("-", "").slice(0, 20)}`
      customers.set(customerId, {
        customer_id: customerId,
        email: body.email,
        name: body.name,
      })
      return send(res, 200, { customer_id: customerId })
    }
    const subGet = url.pathname.match(/^\/v1\/subscriptions\/([^/]+)$/)
    if (method === "GET" && subGet) {
      const subscription = subscriptions.get(subGet[1]!)
      if (!subscription) return send(res, 404, { detail: "Not found" })
      return send(res, 200, asSubscriptionDoc(subscription))
    }
    if (method === "POST" && url.pathname === "/v1/products") {
      const body = JSON.parse((await readBody(req)).toString() || "{}") as {
        name?: string
        price?: { currency?: string; amount?: string }
        billing_cycle?: { interval?: "month" | "year" }
      }
      const productId = `prod_${randomUUID().replaceAll("-", "").slice(0, 20)}`
      products.set(productId, {
        product_id: productId,
        name: body.name ?? "Product",
        amount: body.price?.amount ?? "0.00",
        currency: body.price?.currency ?? "ZAR",
        interval: body.billing_cycle?.interval,
      })
      return send(res, 200, { product_id: productId })
    }
    return send(res, 404, { detail: "Not found" })
  } catch (error) {
    console.error(error)
    return send(res, 500, { detail: "Mock error" })
  }
})

async function createCheckout(req: IncomingMessage): Promise<unknown> {
  const body = JSON.parse((await readBody(req)).toString() || "{}") as {
    product_cart?: { product_id: string; quantity: number }[]
    customer?: { customer_id?: string; email?: string; name?: string }
    success_url?: string
    cancel_url?: string
    reference?: string
    metadata?: Record<string, string>
  }
  const customerId =
    body.customer?.customer_id ??
    `cust_${randomUUID().replaceAll("-", "").slice(0, 20)}`
  const session: CheckoutSession = {
    checkout_id: `chk_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
    status: "open",
    products: body.product_cart ?? [],
    customer: customers.get(customerId) ?? {
      customer_id: customerId,
      email: body.customer?.email,
      name: body.customer?.name,
    },
    metadata: body.metadata ?? {},
    success_url: body.success_url,
    cancel_url: body.cancel_url,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60_000,
  }
  checkouts.set(session.checkout_id, session)
  for (const item of session.products) productFor(item.product_id)
  console.log(
    `[mock-bachs] checkout ${session.checkout_id} → ${BASE}/checkout/${session.checkout_id}`
  )
  void deliver("checkout.created", {
    checkout_id: session.checkout_id,
    status: "OPEN",
    metadata: session.metadata,
  })
  return asSessionDoc(session)
}

function asSessionDoc(session: CheckoutSession) {
  return {
    checkout_id: session.checkout_id,
    checkout_url: `${BASE}/checkout/${session.checkout_id}`,
    status: session.status === "open" ? "OPEN" : session.status.toUpperCase(),
    expires_at: new Date(session.expiresAt).toISOString(),
    customer: session.customer,
    product_cart: session.products,
    metadata: session.metadata,
    ...(session.success_url ? { success_url: session.success_url } : {}),
    ...(session.cancel_url ? { cancel_url: session.cancel_url } : {}),
  }
}

server.listen(PORT, () => {
  if (!WEBHOOK_SECRET)
    console.error(
      "[mock-bachs] BACHS_WEBHOOK_SECRET unset — webhooks will be refused by the app"
    )
  console.log(`Mock Bachs API on ${BASE} → webhooks ${WEBHOOK_TARGET}`)
})
