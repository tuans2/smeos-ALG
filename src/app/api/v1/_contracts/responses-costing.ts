import { z } from "zod"

/**
 * Phản hồi `/api/v1/costing/*`, `/api/v1/pricing-rules`, `/api/v1/price-lists/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh
 * từ kiểu TS của `costing` (costing-types, material-needs, price-scenarios, price-change), `organization`
 * (industry-costing-spec) và `products` (price-list, pricing-rules), đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-costing.test.ts`. Tiền là VNĐ (số nguyên); `null` = cửa hàng chưa nhập, không đoán.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const vndOrNull = z.number().nullable()
const COMPLEXITY = <T extends z.ZodType>(v: T) => z.strictObject({ EASY: v, MEDIUM: v, HARD: v })

// ── Hồ sơ tính giá theo ngành ───────────────────────────────────────────────
const spec = z.strictObject({
  materialCategories: z.array(z.strictObject({ key: z.string(), label: z.string(), defaultUnit: z.string(), defaultWastePercent: z.number() })),
  laborModel: z.enum(["PER_COMPLEXITY", "PER_MINUTE"]),
  defaultOverheadPercent: z.number(),
  defaultPackagingVnd: z.number(),
  priceRoundingVnd: z.number(),
  priceScenarios: z.array(z.strictObject({ key: z.string(), label: z.string(), marginPercent: z.number() })),
  priceChangeAlertPercent: z.number(),
  perishable: z.boolean(),
  bomAdapter: z.string(),
  starterMaterials: z.array(z.strictObject({ name: z.string(), categoryKey: z.string(), unit: z.string() })),
})
const costConfig = z.strictObject({
  laborModel: z.enum(["PER_COMPLEXITY", "PER_MINUTE"]),
  laborRatePerHourVnd: vndOrNull,
  laborByComplexityVnd: COMPLEXITY(z.number()).nullable(),
  overheadPercent: z.number(),
  packagingVnd: z.number(),
  wastePercentByCategory: z.record(z.string(), z.number()),
})
/** `supported: false` (ngành chưa có công cụ tính giá) → `spec` và `config` là `null`. */
export const costingProfileResponse = data(
  z.strictObject({ supported: z.boolean(), industryKey: z.string(), spec: spec.nullable(), config: costConfig.nullable() })
)

// ── Nguyên liệu ─────────────────────────────────────────────────────────────
const material = z.strictObject({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  categoryKey: z.string(),
  unitCostVnd: vndOrNull,
  onHandQty: z.number().nullable(),
  active: z.boolean(),
  supplierName: z.string().nullable(),
})
export const materialResponse = data(material)
/** `priceChange`: `null` khi chưa đủ 2 mốc giá để so. */
export const materialsResponse = data(
  z.array(material.extend({ priceChange: z.strictObject({ previousVnd: z.number(), currentVnd: z.number(), changePercent: z.number(), alert: z.boolean() }).nullable() }))
)
export const materialHistoryResponse = data(z.array(z.strictObject({ unitCostVnd: z.number(), effectiveAt: timestamp })))

// ── Công thức ───────────────────────────────────────────────────────────────
const recipe = z.strictObject({
  productId: z.string(),
  version: z.number(),
  note: z.string().nullable(),
  wastePercent: z.number().nullable(),
  laborMinutes: z.number().nullable(),
  lines: z.array(z.strictObject({ materialId: z.string(), quantity: z.number() })),
})
/** Đã có công thức → `recipe`, `draft = null`; chưa có → `recipe = null`, `draft` đọc từ BOM AI (dòng chưa ghép nguyên liệu: `materialId = null`). */
export const recipeResponse = data(
  z.strictObject({
    product: z.strictObject({ id: z.string(), name: z.string() }),
    recipe: recipe.nullable(),
    draft: z.array(z.strictObject({ name: z.string(), quantity: z.number(), unit: z.string(), categoryKey: z.string(), materialId: z.string().nullable() })).nullable(),
  })
)
export const savedRecipeResponse = data(z.strictObject({ version: z.number() }))

// ── Giá vốn & kịch bản giá ──────────────────────────────────────────────────
const costBreakdown = z.strictObject({
  lines: z.array(
    z.strictObject({ materialId: z.string(), name: z.string(), quantity: z.number(), unit: z.string(), unitCostVnd: vndOrNull, lineCostVnd: vndOrNull })
  ),
  materialVnd: z.number(),
  wasteVnd: z.number(),
  laborVnd: z.number(),
  packagingVnd: z.number(),
  overheadVnd: z.number(),
  totalVnd: z.number(),
  missingPrices: z.array(z.string()),
  laborMissing: z.boolean(),
  complete: z.boolean(),
})
/** Chưa có công thức → `hasRecipe: false`, `cost: null`. Kịch bản giá chỉ có khi giá vốn đủ (`cost.complete`). */
export const productCostResponse = data(
  z.strictObject({
    product: z.strictObject({ id: z.string(), name: z.string(), priceVnd: vndOrNull }),
    hasRecipe: z.boolean(),
    cost: costBreakdown.nullable(),
    scenarios: z.array(
      z.strictObject({ key: z.string(), label: z.string(), priceVnd: z.number(), profitVnd: z.number(), marginPercent: z.number(), warnings: z.array(z.string()) })
    ),
  })
)
export const applyPriceResponse = data(z.strictObject({ previousPriceVnd: vndOrNull, priceVnd: z.number() }))

// ── Dự toán mua ─────────────────────────────────────────────────────────────
export const needsResponse = data(
  z.strictObject({
    needs: z.array(
      z.strictObject({
        materialId: z.string(),
        name: z.string(),
        unit: z.string(),
        requiredQty: z.number(),
        onHandQty: z.number().nullable(),
        toBuyQty: z.number(),
        estimatedCostVnd: vndOrNull,
        orderIds: z.array(z.string()),
      })
    ),
    productsWithoutRecipe: z.array(z.string()),
    totalEstimatedVnd: z.number(),
    costIncomplete: z.boolean(),
    perishable: z.boolean(),
    orderCount: z.number(),
  })
)
export const purchaseResponse = data(z.strictObject({ updated: z.number() }))

// ── Quy tắc giá ─────────────────────────────────────────────────────────────
/** Không bọc `{ data }` — route trả thẳng cấu hình hiệu lực của phạm vi (tổ chức, hoặc chi nhánh `branch_id`). */
export const pricingRulesResponse = z.strictObject({
  branch_id: z.string().nullable(),
  partner_tier_bonus: z.record(z.string(), z.number()),
  surcharge_groups: z.array(
    z.strictObject({ id: z.string(), name: z.string(), options: z.array(z.strictObject({ label: z.string(), value: z.number() })) })
  ),
  optimal_price_ratio: z.number(),
  floor_ceiling_ratio: z.strictObject({ floorRatio: z.number(), ceilingRatio: z.number() }),
  customer_tier_discount: z.strictObject({ NEW: z.number(), BRONZE: z.number(), SILVER: z.number(), GOLD: z.number(), VIP: z.number() }),
  peak_hour_surcharge: z.array(z.strictObject({ startHour: z.number(), endHour: z.number(), vnd: z.number(), label: z.string() })),
})
/** Ghi xong trả lại cấu hình hiệu lực của phạm vi vừa ghi. */
export const pricingRulePutResponse = pricingRulesResponse

// ── Bảng giá ────────────────────────────────────────────────────────────────
/** Không bọc `{ data }` — route trả thẳng bảng giá. */
export const priceListResponse = z.strictObject({
  id: z.string(),
  name: z.string(),
  heading: z.string(),
  note: z.string(),
  categories: z.array(z.string()),
  productIds: z.array(z.string()).nullable(),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
  showPeakPrice: z.boolean(),
  showPromotions: z.boolean(),
  active: z.boolean(),
  archived: z.boolean(),
  status: z.enum(["ACTIVE", "PAUSED", "SCHEDULED", "EXPIRED"]),
  updatedAt: timestamp,
})
const categoryOption = z.strictObject({ value: z.string(), label: z.string() })
export const priceListsResponse = z.strictObject({ data: z.array(priceListResponse), categories: z.array(categoryOption) })
export const priceListDocumentResponse = z.strictObject({
  priceList: priceListResponse,
  groups: z.array(
    z.strictObject({
      category: z.string(),
      rows: z.array(
        z.strictObject({
          productId: z.string(),
          code: z.string(),
          name: z.string(),
          mode: z.enum(["FIXED", "RANGE", "CONTACT"]),
          priceVnd: vndOrNull,
          peakPriceVnd: vndOrNull,
          options: z.array(z.strictObject({ name: z.string(), priceVnd: z.number(), peakPriceVnd: vndOrNull })),
        })
      ),
    })
  ),
  /** Ưu đãi đang bật trong Hồ sơ tiệm (đã áp khoá tầng trên) — chỉ khi `showPromotions`. */
  promotions: z.array(z.strictObject({ id: z.string(), title: z.string(), customerText: z.string(), kind: z.string(), percent: z.number().nullable() })),
  categories: z.array(categoryOption),
  productCount: z.number(),
})
export const okResponse = z.strictObject({ ok: z.literal(true) })
