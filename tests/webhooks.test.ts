import { createHmac, randomUUID } from "node:crypto"

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  balanceOf,
  clearDatabase,
  createUser,
  installFakeHiggsfield,
  setupEnv,
  startDatabase,
  stopDatabase,
  type FakeHiggsfield,
} from "./support/harness"

setupEnv()
Object.assign(process.env, {
  BACHS_API_URL: "https://sandbox-api.bachs.io",
  BACHS_SECRET_KEY: "sk_sandbox_test_fake_000000",
  BACHS_WEBHOOK_SECRET: "hdsk_test_webhook_secret",
  BACHS_PRICE_PLUS_MONTHLY: "prod_plus_month",
  BACHS_PRICE_PLUS_ANNUAL: "prod_plus_year",
})

// Route handlers run `after()` work post-response; run it inline in tests.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>()
  return { ...actual, after: (work: () => Promise<unknown>) => void work() }
})

// Bachs API calls made by handlers (the webhook payload itself is local).
const bachsApi = {
  getBachsSubscription: vi.fn(),
  getCheckoutSession: vi.fn(),
}
vi.mock("@/lib/billing/bachs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/bachs")>()
  return {
    ...actual,
    getBachsSubscription: bachsApi.getBachsSubscription,
    getCheckoutSession: bachsApi.getCheckoutSession,
  }
})

const { handleBachsEvent } = await import("@/lib/billing/bachs-events")
const { verifyBachsWebhook } = await import("@/lib/billing/bachs")
const { submitGeneration } = await import("@/lib/generations/submit")
const { generationStatuses } = await import("@/lib/generations/library")
const { webhookToken } = await import("@/lib/higgsfield/webhook")
const { collections } = await import("@/lib/db/collections")
const { POST: higgsfieldWebhook } =
  await import("@/app/api/webhooks/higgsfield/route")
const { ObjectId } = await import("mongodb")
type BachsEvent = Parameters<typeof handleBachsEvent>[0]

let fake: FakeHiggsfield
beforeAll(startDatabase, 120_000)
afterAll(stopDatabase)
beforeEach(async () => {
  await clearDatabase()
  fake = await installFakeHiggsfield()
  vi.stubGlobal("fetch", fake.fetch)
  bachsApi.getBachsSubscription.mockReset()
  bachsApi.getCheckoutSession.mockReset()
})

const event = (
  type: string,
  data: Record<string, unknown>,
  id = `evt_${randomUUID()}`
) =>
  ({
    id,
    type,
    created_at: new Date().toISOString(),
    data,
  }) as unknown as BachsEvent

describe("Bachs webhooks", () => {
  it("credits a paid top-up once, even when the event is delivered twice", async () => {
    const user = await createUser()
    const payload = {
      charge_id: "ch_topup",
      checkout_id: "chk_topup",
      status: "SUCCEEDED",
      amount: "20.00",
      currency: "USD",
      customer: { id: "cust_123", email: user.email },
      metadata: {
        user_id: user.id,
        kind: "topup",
        pack: "medium",
        credits: "2420",
      },
    }
    const first = event("collection.succeeded", payload, "evt_same")
    expect(await handleBachsEvent(first)).toBe("processed")
    expect(await handleBachsEvent(first)).toBe("duplicate")
    // A distinct event for the same checkout is also a no-op (ledger id).
    await handleBachsEvent(event("collection.succeeded", payload))
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 2420,
    })
    const { users } = await collections()
    expect((await users.findOne({ _id: user.objectId }))!.bachsCustomerId).toBe(
      "cust_123"
    )
  })

  it("re-reads the checkout session when the event metadata is missing", async () => {
    const user = await createUser()
    bachsApi.getCheckoutSession.mockResolvedValue({
      checkout_id: "chk_refetch",
      customer: { customer_id: "cust_refetch" },
      metadata: {
        user_id: user.id,
        kind: "topup",
        pack: "small",
        credits: "500",
      },
    })
    await handleBachsEvent(
      event("collection.succeeded", {
        charge_id: "ch_refetch",
        checkout_id: "chk_refetch",
        status: "SUCCEEDED",
        amount: "5.00",
        currency: "USD",
      })
    )
    expect(bachsApi.getCheckoutSession).toHaveBeenCalledWith("chk_refetch")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 500,
    })
  })

  it("never grants from an out-of-band collection (no checkout metadata)", async () => {
    const user = await createUser()
    // A virtual-account deposit has no checkout and no claimable metadata.
    await handleBachsEvent(
      event("collection.succeeded", {
        charge_id: "ch_deposit",
        checkout_id: null,
        status: "SUCCEEDED",
        amount: "9.99",
        currency: "USD",
        customer: { id: "cust_deposit" },
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 0,
    })
  })

  it("resets the subscription bucket on each paid invoice and records the plan", async () => {
    const user = await createUser({ subscription: 40, topup: 10 }, "free")
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      { $set: { bachsCustomerId: "cust_sub" } }
    )
    bachsApi.getBachsSubscription.mockResolvedValue({
      subscription_id: "sub_1",
      customer: { customer_id: "cust_sub" },
      product_id: "prod_plus_month",
      metadata: { user_id: user.id, plan: "plus" },
      status: "active",
      current_period_end: "2030-01-01T00:00:00.000Z",
    })
    const invoice = (id: string) =>
      event("invoice.paid", {
        invoice_id: id,
        subscription: { subscription_id: "sub_1" },
        customer: { customer_id: "cust_sub" },
      })
    await handleBachsEvent(invoice("inv_1"))
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 3500,
      topup: 10,
    })
    await users.updateOne(
      { _id: user.objectId },
      { $set: { "credits.subscription": 12 } }
    )
    await handleBachsEvent(invoice("inv_2"))
    await handleBachsEvent(invoice("inv_2"))
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 3500,
      topup: 10,
    })
    const account = await users.findOne({ _id: user.objectId })
    expect(account!.plan).toBe("plus")
    expect(account!.planInterval).toBe("month")
    expect(account!.bachsSubscriptionId).toBe("sub_1")

    // One-off charges also emit invoice.paid; only the collection event
    // may grant top-ups, so a subscription-less invoice changes nothing.
    await users.updateOne(
      { _id: user.objectId },
      { $set: { "credits.subscription": 55 } }
    )
    await handleBachsEvent(
      event("invoice.paid", {
        invoice_id: "inv_topup",
        subscription: null,
        customer: { customer_id: "cust_sub" },
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 55,
      topup: 10,
    })
  })

  it("drops stale subscription updates that arrive out of order", async () => {
    const user = await createUser({}, "plus")
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      {
        $set: {
          bachsCustomerId: "cust_order",
          bachsSubscriptionId: "sub_order",
        },
      }
    )
    const sub = {
      subscription_id: "sub_order",
      customer: { customer_id: "cust_order" },
      metadata: { user_id: user.id },
    }
    const cancel = event(
      "customer.subscription.updated",
      { ...sub, status: "active", cancel_at_period_end: true },
      "evt_cancel"
    )
    await handleBachsEvent(cancel)
    expect((await users.findOne({ _id: user.objectId }))!.planStatus).toBe(
      "canceling"
    )
    // The same subscription state from before the cancel event is stale.
    const stale = {
      ...sub,
      status: "active",
      cancel_at_period_end: false,
      product_id: "prod_plus_month",
    }
    await handleBachsEvent({
      ...event("customer.subscription.created", stale, "evt_late"),
      created_at: new Date(Date.now() - 60_000).toISOString(),
    })
    expect((await users.findOne({ _id: user.objectId }))!.planStatus).toBe(
      "canceling"
    )
  })

  it("ends a canceled subscription: back to Free, plan credits lapse", async () => {
    const user = await createUser({ subscription: 900, topup: 50 }, "plus")
    const { users } = await collections()
    await users.updateOne(
      { _id: user.objectId },
      { $set: { bachsCustomerId: "cust_end", bachsSubscriptionId: "sub_end" } }
    )
    await handleBachsEvent(
      event("customer.subscription.deleted", {
        subscription_id: "sub_end",
        customer: { customer_id: "cust_end" },
        metadata: { user_id: user.id },
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 50,
    })
    expect((await users.findOne({ _id: user.objectId }))!.plan).toBe("free")
  })

  it("claws back refunded top-up credits without going below zero and flags the account", async () => {
    const user = await createUser({ topup: 300 })
    bachsApi.getCheckoutSession.mockResolvedValue({
      checkout_id: "chk_refund",
      customer: { customer_id: "cust_refund" },
      metadata: {
        user_id: user.id,
        kind: "topup",
        pack: "large",
        credits: "500",
      },
    })
    await handleBachsEvent(
      event("refund.paid", {
        refund_id: "ref_1",
        charge_id: "ch_1",
        requested_amount: "50.00",
        refunded_amount: "50.00",
        reference: "chk_refund",
      })
    )
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 0,
    })
    const { users } = await collections()
    expect(
      (await users.findOne({ _id: user.objectId }))!.billingFlag?.reason
    ).toMatch(/already spent/)
  })
})

describe("Bachs webhook signatures", () => {
  const secret = process.env.BACHS_WEBHOOK_SECRET!
  const body = JSON.stringify({
    id: "evt_sig",
    type: "collection.succeeded",
    created_at: new Date().toISOString(),
    data: {},
  })
  const timestamp = () => Math.floor(Date.now() / 1000)
  const sign = (payload: string, at: number) =>
    createHmac("sha256", secret).update(`${at}.${payload}`).digest("hex")

  it("accepts the V2 header scheme and the legacy pair", () => {
    const t = timestamp()
    const v2 = verifyBachsWebhook({
      body,
      v2: `t=${t},v1=${sign(body, t)}`,
      legacySignature: null,
      legacyTimestamp: null,
      secret,
    })
    expect(v2?.id).toBe("evt_sig")
    // Multiple v1 candidates: any match wins.
    expect(
      verifyBachsWebhook({
        body,
        v2: `t=${t},v1=deadbeef,v1=${sign(body, t)}`,
        legacySignature: null,
        legacyTimestamp: null,
        secret,
      })?.type
    ).toBe("collection.succeeded")
    const legacy = verifyBachsWebhook({
      body,
      v2: null,
      legacySignature: sign(body, t),
      legacyTimestamp: String(t),
      secret,
    })
    expect(legacy?.id).toBe("evt_sig")
  })

  it("rejects a tampered body and a stale timestamp", () => {
    const t = timestamp()
    expect(
      verifyBachsWebhook({
        body: JSON.stringify({
          id: "evt_other",
          type: "invoice.paid",
          data: {},
        }),
        v2: `t=${t},v1=${sign(body, t)}`,
        legacySignature: null,
        legacyTimestamp: null,
        secret,
      })
    ).toBeUndefined()
    const stale = timestamp() - 900 // > 300 s tolerance
    expect(
      verifyBachsWebhook({
        body,
        v2: `t=${stale},v1=${sign(body, stale)}`,
        legacySignature: null,
        legacyTimestamp: null,
        secret,
      })
    ).toBeUndefined()
    expect(
      verifyBachsWebhook({
        body,
        v2: null,
        legacySignature: null,
        legacyTimestamp: null,
        secret,
      })
    ).toBeUndefined()
  })
})

describe("Higgsfield webhook route", () => {
  async function submitted() {
    const user = await createUser({ topup: 100 })
    const view = await submitGeneration(user, {
      submitKey: randomUUID(),
      modelId: "qwen-image-3",
      prompt: "A lighthouse at dusk",
      settings: {},
      media: [],
    })
    const { generations } = await collections()
    const doc = (await generations.findOne({ _id: new ObjectId(view.id) }))!
    return { user, view, doc }
  }

  const call = (gid: string, token: string, body: unknown) =>
    higgsfieldWebhook(
      new Request(
        `http://localhost:3000/api/webhooks/higgsfield?gid=${gid}&t=${token}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      )
    )

  it("rejects a bad token with 401 (not retried by the platform)", async () => {
    const { doc } = await submitted()
    const response = await call(doc._id.toHexString(), "0".repeat(64), {
      request_id: doc.hfRequestId,
      status: "completed",
    })
    expect(response.status).toBe(401)
  })

  it("never trusts the payload: re-fetches status before finalizing", async () => {
    const { user, doc, view } = await submitted()
    const gid = doc._id.toHexString()
    // Payload claims success, but the platform says it failed.
    fake.requests.get(doc.hfRequestId!)!.status = "failed"
    const response = await call(gid, webhookToken(gid, "webhook-secret"), {
      request_id: doc.hfRequestId,
      status: "completed",
      payload: { images: [{ url: "https://evil.example/fake.png" }] },
    })
    expect(response.status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("failed")
    expect(await balanceOf(user.objectId)).toEqual({
      subscription: 0,
      topup: 100,
    })
  })

  it("finalizes once when the same delivery arrives twice", async () => {
    const { user, doc, view } = await submitted()
    const gid = doc._id.toHexString()
    fake.complete(doc.hfRequestId!, "image")
    const body = { request_id: doc.hfRequestId, status: "completed" }
    const token = webhookToken(gid, "webhook-secret")
    expect((await call(gid, token, body)).status).toBe(200)
    expect((await call(gid, token, body)).status).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 50))
    const [after] = await generationStatuses(user.objectId, [view.id])
    expect(after!.status).toBe("completed")
    expect(after!.outputs).toHaveLength(1)
  })

  it("rejects malformed envelopes with 400", async () => {
    const { doc } = await submitted()
    const gid = doc._id.toHexString()
    const response = await call(gid, webhookToken(gid, "webhook-secret"), {
      status: "completed",
    })
    expect(response.status).toBe(400)
  })
})
