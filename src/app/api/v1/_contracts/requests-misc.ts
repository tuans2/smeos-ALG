import { z } from "zod"

import { printPresetCodes } from "@/modules/print/domain/print-rendition"

/**
 * Lược đồ yêu cầu của `/api/v1/session/*` (phiên của chính người đăng nhập), `/api/v1/reports/*` (báo cáo),
 * `/api/v1/print/*` (bản in), `/api/v1/vouchers/*` (mã giảm giá) và `/api/v1/usage/*` (credit & hạn mức) — OpenAPI nội
 * bộ, PO 07/11/2026. Lược đồ từng khai trong 7 route được chuyển NGUYÊN VĂN về đây và route import lại; thân tạo bản in
 * là lược đồ của module (`print/domain/print-rendition.ts`, xuất lại). Query chỉ để mô tả.
 */
export { createPrintRenditionSchema } from "@/modules/print/domain/print-rendition"

// session/organization/route.ts
export const switchOrganizationBody = z.object({ organization_id: z.string() })

// session/password/route.ts
export const changePasswordBody = z.object({ current_password: z.string().max(200), new_password: z.string().max(200) })

// usage/limits/route.ts
export const aiMonthlyLimitBody = z.object({ aiMonthlyLimit: z.number().int().nullable() })

// vouchers/batches/route.ts
const optionalDate = z.string().datetime({ offset: true }).nullable().optional()
const optionalInt = z.number().int().nullable().optional()

export const createVoucherBatchBody = z.object({
  name: z.string().max(200),
  mode: z.enum(["SHARED", "UNIQUE"]),
  shared_code: z.string().max(64).nullable().optional(),
  code_prefix: z.string().max(32).nullable().optional(),
  quantity: z.number().int().optional(),
  promotion_id: z.string().max(100).nullable().optional(),
  discount_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discount_value: z.number(),
  min_order_vnd: z.number().int().optional(),
  max_discount_vnd: optionalInt,
  starts_at: optionalDate,
  expires_at: optionalDate,
  usage_limit: optionalInt,
  per_customer_limit: optionalInt,
})

// vouchers/batches/[id]/route.ts
export const voucherBatchActiveBody = z.object({ is_active: z.boolean() })

// print/preflight/route.ts
export const preflightBody = z.object({
  presetCode: z.enum(printPresetCodes),
  imageWidthPx: z.number().int().positive().optional(),
  imageHeightPx: z.number().int().positive().optional(),
  colorMode: z.enum(["RGB", "CMYK"]).optional(),
  hasQrCode: z.boolean().optional(),
  qrSizeMm: z.number().positive().optional(),
  hasContentOutsideSafeZone: z.boolean().optional(),
})

// print/renditions/[id]/export/route.ts
export const printExportBody = z.object({
  title: z.string().trim().optional(),
  subtitle: z.string().trim().optional(),
  storeName: z.string().trim().optional(),
  includeBleedMarks: z.boolean().default(true),
  // ≤ 20 MB ảnh sau giải mã base64 (4/3) cộng tiền tố data URL; kiểm nội dung ở use-case.
  imageDataUrl: z.string().max(28_000_000).optional(),
})

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const reportQuery = z.object({ from: day.optional(), to: day.optional(), granularity: z.enum(["day", "week", "month"]).optional(), detail: z.string().optional() })
export const usageListQuery = z.object({ limit: int.optional(), cursor: z.string().optional() })
export const usageSummaryQuery = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() })
export const renditionsQuery = z.object({
  preset_code: z.enum(printPresetCodes).optional(),
  status: z.enum(["PENDING", "READY", "FAILED"]).optional(),
  source_type: z.string().optional(),
  limit: int.optional(),
  offset: int.optional(),
})
