/**
 * Idempotent database setup: indexes, the Effects preset seed, and (with
 * --admin=email) an admin role for an existing or future user.
 *   pnpm db:init [--admin=you@example.com]
 */
import "./load-env"

import { ObjectId } from "mongodb"

const testUserArg = process.argv.find((arg) => arg.startsWith("--test-user="))
const testUser = testUserArg?.slice("--test-user=".length)
let testUserEmail: string | undefined
if (testUserArg !== undefined) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")
    throw new Error("Refusing to seed a test account in production")
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error("--test-user requires a local MongoDB URI")
  const hostname = new URL(mongoUri).hostname.replace(/^\[|\]$/g, "")
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname))
    throw new Error("--test-user is allowed only with a local MongoDB URI")
  testUserEmail = testUser?.trim().toLowerCase()
  if (!testUserEmail || !/^[^@\s]+@[^@\s]+\.test$/.test(testUserEmail))
    throw new Error("--test-user requires a reserved .test email address")
}

const { db, closeMongoForTests } = await import("../lib/db/mongo")
const { ensureIndexes } = await import("../lib/db/indexes")
const { grantCredits } = await import("../lib/billing/ledger")
const { env } = await import("../lib/env")
const { seedPresets } = await import("../lib/presets")

const database = await db()
const indexes = await ensureIndexes(database)
console.log(`indexes: ${indexes.length} ensured`)
console.log(`presets: ${await seedPresets()} inserted`)

const admin = process.argv
  .find((arg) => arg.startsWith("--admin="))
  ?.split("=")[1]
if (admin) {
  const email = admin.trim().toLowerCase()
  const result = await database
    .collection("users")
    .updateOne({ email }, { $set: { role: "admin" } })
  console.log(
    result.matchedCount
      ? `admin: ${email} is now an admin`
      : `admin: no user ${email} yet — add it to ADMIN_EMAILS or sign in first`
  )
}

if (testUserEmail) {
  const users = database.collection<{
    _id: ObjectId
    email: string
    name: string
    emailVerified: Date
    role: "user"
    credits: { subscription: number; topup: number }
    plan: "free"
    createdAt: Date
  }>("users")
  await users.updateOne(
    { email: testUserEmail },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        email: testUserEmail,
        name: "Vendo Test Seller",
        emailVerified: new Date(),
        role: "user",
        credits: { subscription: 0, topup: 0 },
        plan: "free",
        createdAt: new Date(),
      },
    },
    { upsert: true }
  )
  const user = await users.findOne({ email: testUserEmail })
  if (!user) throw new Error("Test account was not created")
  const bonus = env().SIGNUP_BONUS_CREDITS
  if (bonus > 0)
    await grantCredits({
      userId: user._id,
      bucket: "topup",
      amount: bonus,
      reason: "signup_bonus",
      refType: "user",
      refId: user._id.toHexString(),
      note: "Local test account welcome credits",
    })
  console.log(
    `test user: ${testUserEmail} (${bonus.toLocaleString("en-US")} welcome credits; use a local magic link to sign in)`
  )
}
await closeMongoForTests()
