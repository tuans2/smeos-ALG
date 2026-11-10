import { z } from "zod"

import { LANDING_TYPE_OPTIONS } from "@/modules/landing-page/domain/preset-catalog"

/**
 * Lược đồ yêu cầu của `/api/v1/content-engine/*` (viết nội dung AI: bài đa kênh, landing page, catalog, viết lại nhanh)
 * và `/api/v1/market-intelligence/*` (xu hướng thị trường, đọc ảnh sản phẩm) — OpenAPI nội bộ, PO 07/11/2026. Lược đồ
 * từng khai trong 3 route được chuyển NGUYÊN VĂN về đây và route import lại; `catalogGenerateBody` là BẢN SAO (route
 * `catalog-generate` nằm trong vùng Catalog đóng băng, tự khai lược đồ — `catalog-generate-contract.test.ts` giữ hai bên
 * khớp). Thân bài đa kênh là hợp đồng của
 * `content-engine/contracts/generation.ts`, thân đọc ảnh là hợp đồng Chặng 02/03 của Creative Studio (xuất lại).
 */
export { approveGenerationBodySchema, generateContentBodySchema, generationLookupQuerySchema } from "@/modules/content-engine/contracts/generation"
export { productIntelligenceBodySchema } from "@/modules/creative-production/contracts/stage-03-discover"
export { visionExtractBodySchema } from "@/modules/creative-production/contracts/stage-02-understand"

// content-engine/catalog-generate/route.ts — BẢN SAO, route đóng băng không import
export const catalogGenerateBody = z.object({
  collectionName: z.string().min(1),
  occasion: z.string().optional(),
  productCount: z.number().int().nonnegative().default(0),
  styleVariant: z.enum(["EDITORIAL_LOOKBOOK", "MODERN_SHOWROOM", "COMPACT_LIST"]).default("MODERN_SHOWROOM"),
  userDirectives: z.string().optional(),
  /** Chỉ để máy chủ tự đọc mô tả bán hàng đã duyệt của tenant */
  productIds: z.array(z.string().min(1).max(64)).max(50).optional(),
})

// content-engine/landing-generate/route.ts
const PAGE_TYPES = LANDING_TYPE_OPTIONS.map((o) => o.type) as [string, ...string[]]

export const landingGenerateBody = z.object({
  occasionId: z.string().min(1),
  occasionLabel: z.string().min(1),
  archetypeId: z.string().optional(),
  selectedProducts: z.array(
    z.object({
      /** Chỉ để máy chủ tự đọc mô tả bán hàng đã duyệt của tenant — không nhận mô tả từ trình duyệt */
      id: z.string().min(1).max(64).optional(),
      name: z.string().min(1),
      code: z.string().optional(),
      price: z.number().nullable().optional(),
      category: z.string().nullable().optional(),
    })
  ).default([]),
  userDirectives: z.string().optional(),
  discountPercent: z.number().int().min(1).max(99).optional(),
  usps: z.array(z.string()).optional(),
  guarantees: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  designDirection: z.string().optional(),
  pageType: z.enum(PAGE_TYPES).optional(),
})

// content-engine/rewrite/route.ts
export const rewriteBody = z.object({
  text: z.string().trim().min(1, "Nội dung cần viết lại không được rỗng").max(500),
  field_type: z.enum(["gift", "guarantee", "cta", "description", "general"]).default("general"),
  style: z.enum(["luxurious", "sweet", "concise", "creative"]).default("luxurious"),
})

// market-intelligence/research-runs/route.ts
export const researchRunBody = z.object({
  run_type: z.enum(["DAILY_DEEP", "INTRADAY_PULSE", "WEEKLY_DEEP", "MANUAL"]).optional(),
  keyword: z.string().optional(),
  geo: z.string().optional(),
  timeframe: z.string().optional(),
  channel: z.string().optional(),
})

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
export const opportunitiesQuery = z.object({
  limit: z.string().regex(/^-?\d+$/).optional(),
  cursor: z.string().optional(),
  min_score: z.string().optional(),
  timeframe: z.string().optional(),
})
