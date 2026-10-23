import { verifyBachsWebhook, type BachsEvent } from "@/lib/billing/bachs"
import { handleBachsEvent } from "@/lib/billing/bachs-events"
import { env } from "@/lib/env"
import { json } from "@/lib/http"

export const runtime = "nodejs"

/**
 * Bachs webhook: raw body + signature check (V2 header, legacy fallback),
 * idempotent handlers. 2xx until the work is done; the 400 path is only for
 * bad signatures; a 500 makes Bachs retry (~5 attempts over ~80 minutes).
 */
export async function POST(request: Request) {
  const secret = env().BACHS_WEBHOOK_SECRET
  if (!secret)
    return json({ error: "Bachs webhooks are not configured" }, 503)
  const payload = await request.text()
  const event: BachsEvent | undefined = verifyBachsWebhook({
    body: payload,
    v2: request.headers.get("x-bachs-signature-v2"),
    legacySignature: request.headers.get("x-bachs-signature"),
    legacyTimestamp: request.headers.get("x-bachs-timestamp"),
    secret,
  })
  if (!event) return json({ error: "Invalid signature" }, 400)
  try {
    const result = await handleBachsEvent(event)
    return json({ received: true, result })
  } catch (error) {
    console.error(`[bachs] ${event.type} ${event.id} failed`, error)
    return json({ error: "Handler failed" }, 500)
  }
}
