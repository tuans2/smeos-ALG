import { z } from "zod"

import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { salesPitchRecord } from "@/modules/products/domain/sales-pitch-record"
import { saveSalesPitch } from "@/modules/content-studio/use-cases/content-product"

/** PUT /api/v1/content-studio/products/[id]/sales-pitch (L3) — chốt Thẻ chào sản phẩm, lưu vào Kho sản phẩm. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  rateLimit: { scope: "content-studio-sales-pitch", limit: 30, windowMs: 60_000, per: "user" },
  body: z.object({ pitch: salesPitchRecord }),
  handler: async ({ ctx, params, body }) => ok(await saveSalesPitch(ctx, params.id ?? "", body.pitch)),
})
