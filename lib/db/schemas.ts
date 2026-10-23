import "server-only"

import { ObjectId } from "mongodb"
import { z } from "zod"

import type { GenerationDoc, LedgerDoc, ProjectDoc } from "@/lib/db/collections"

const creditsSchema = z.object({
  subscription: z.number().int().nonnegative(),
  topup: z.number().int().nonnegative(),
})

const generationMediaSchema = z.object({
  role: z.enum(["start", "end", "reference", "video", "audio", "source"]),
  kind: z.enum(["image", "video", "audio"]),
  url: z.string().min(1).max(2048),
  name: z.string().max(200).optional(),
})

const generationOutputSchema = z.object({
  kind: z.enum(["image", "video", "audio"]),
  url: z.string().min(1).max(2048),
  key: z.string().min(1),
  contentType: z.string().min(1).max(200),
  bytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSec: z.number().positive().optional(),
  storage: z.enum(["r2", "local", "platform"]),
  platformUrl: z.string().url().optional(),
})

export const generationDocumentSchema: z.ZodType<GenerationDoc> = z
  .object({
    _id: z.instanceof(ObjectId),
    userId: z.instanceof(ObjectId),
    projectId: z.instanceof(ObjectId).nullable().optional(),
    submitKey: z.uuid(),
    surface: z.enum(["image", "video", "audio"]),
    modelId: z.string().min(1).max(80),
    modelLabel: z.string().min(1).max(200),
    modelPath: z.string().min(1).max(500),
    requestBody: z.record(z.string(), z.unknown()),
    prompt: z.string().max(12_000),
    settings: z.record(z.string(), z.unknown()),
    media: z.array(generationMediaSchema).max(60),
    status: z.enum([
      "pending_submit",
      "queued",
      "in_progress",
      "completed",
      "failed",
      "nsfw",
      "canceled",
    ]),
    hfRequestId: z.string().min(1).optional(),
    cost: z.number().int().nonnegative(),
    costSplit: creditsSchema,
    refunded: z.number().int().nonnegative(),
    priceUsd: z.number().nonnegative(),
    billing: z.object({
      units: z.number().positive(),
      provisional: z.boolean(),
      creditsPerUnit: z.number().nonnegative(),
      unitScale: z.number().nonnegative().optional(),
      unitOffset: z.number().nonnegative().optional(),
      extraCredits: z.number().int().nonnegative().optional(),
    }),
    outputs: z.array(generationOutputSchema),
    aspect: z.number().positive(),
    error: z.string().max(2_000).optional(),
    errorKind: z
      .enum(["failed", "nsfw", "canceled", "submit", "timeout"])
      .optional(),
    isPublic: z.boolean(),
    publishedAt: z.date().optional(),
    unpublishedByAdmin: z.boolean().optional(),
    presetId: z.string().max(80).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    submittedAt: z.date().optional(),
    finishedAt: z.date().optional(),
    finalizeLeaseUntil: z.date().optional(),
    finalizeAttempts: z.number().int().nonnegative(),
  })
  .strict()

export const ledgerDocumentSchema: z.ZodType<LedgerDoc> = z
  .object({
    _id: z.instanceof(ObjectId),
    userId: z.instanceof(ObjectId),
    delta: z
      .number()
      .int()
      .refine((value) => value !== 0),
    bucket: z.enum(["subscription", "topup"]),
    reason: z.enum([
      "generation_debit",
      "generation_refund",
      "generation_adjust",
      "subscription_grant",
      "subscription_reset",
      "topup_purchase",
      "signup_bonus",
      "admin_adjust",
      "bachs_refund",
    ]),
    refType: z.string().min(1).max(100),
    refId: z.string().min(1).max(200),
    balanceAfter: creditsSchema,
    note: z.string().max(500).optional(),
    actorId: z.instanceof(ObjectId).optional(),
    createdAt: z.date(),
  })
  .strict()

export const projectDocumentSchema: z.ZodType<ProjectDoc> = z
  .object({
    _id: z.instanceof(ObjectId),
    userId: z.instanceof(ObjectId),
    name: z.string().trim().min(1).max(80),
    coverGenerationId: z.instanceof(ObjectId).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict()
