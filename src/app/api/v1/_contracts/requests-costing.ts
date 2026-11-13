import { z } from "zod"

/**
 * Lược đồ yêu cầu của `/api/v1/costing/*` (Nhóm công cụ 6 — tính giá theo ngành), `/api/v1/pricing-rules`,
 * `/api/v1/price-lists/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ từng khai trong 7 route được chuyển NGUYÊN VĂN về
 * đây và route import lại; thân bảng giá vẫn ở `price-lists/schema.ts` (dùng chung POST/PUT kèm hàm đổi). Query chỉ
 * để mô tả — route tự đọc `searchParams`.
 */
export { priceListBodySchema } from "@/app/api/v1/price-lists/schema"

// costing/materials/route.ts
export const createMaterialBody = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(30),
  category_key: z.string().min(1),
  unit_cost_vnd: z.number().nonnegative().nullable().optional(),
  supplier_name: z.string().max(120).nullable().optional(),
  on_hand_qty: z.number().nonnegative().nullable().optional(),
})

// costing/materials/[id]/route.ts
export const patchMaterialBody = z.object({
  name: z.string().min(1).max(120).optional(),
  unit: z.string().min(1).max(30).optional(),
  category_key: z.string().min(1).optional(),
  unit_cost_vnd: z.number().nonnegative().nullable().optional(),
  supplier_name: z.string().max(120).nullable().optional(),
  on_hand_qty: z.number().nonnegative().nullable().optional(),
  active: z.boolean().optional(),
})

// costing/needs/purchase/route.ts
export const recordPurchaseBody = z.object({
  items: z
    .array(
      z.object({
        material_id: z.string().min(1),
        quantity: z.number().positive().max(1_000_000),
        unit_cost_vnd: z.number().nonnegative().nullable().optional(),
      }),
    )
    .min(1)
    .max(200),
})

// costing/products/[productId]/price/route.ts
export const applyPriceBody = z.object({
  price_vnd: z.number().positive().max(1_000_000_000),
  scenario: z.string().min(1).max(30),
})

// costing/recipes/[productId]/route.ts
export const saveRecipeBody = z.object({
  lines: z.array(z.object({ material_id: z.string().min(1), quantity: z.number().positive().max(100_000) })).max(200),
  waste_percent: z.number().min(0).max(99.99).nullable().optional(),
  labor_minutes: z.number().int().min(0).max(100_000).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
})

// pricing-rules/route.ts
export const putPricingRuleBody = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  branch_id: z.string().min(1).nullable().optional(),
})

// price-lists/[id]/route.ts
export const priceListActiveBody = z.object({ active: z.boolean() })

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const materialsQuery = z.object({ include_inactive: z.enum(["true", "false"]).optional() })
export const needsQuery = z.object({ from: day, to: day })
export const costQuery = z.object({ competitor_vnd: z.string().optional() })
export const pricingRulesQuery = z.object({ branch_id: z.string().optional() })
