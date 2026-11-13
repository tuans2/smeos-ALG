import { z } from "zod"

/**
 * Lược đồ yêu cầu của nhóm sản phẩm phụ: `/api/v1/product-photo/*`, `/api/v1/product-image-set/*`,
 * `/api/v1/product-change-requests/*`, `/api/v1/availability/*` — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong
 * 6 route được chuyển NGUYÊN VĂN về đây và route import lại. Query chỉ để mô tả.
 */

// product-photo/route.ts
export const productPhotoBody = z.object({
  asset_id: z.string().min(1, "Bắt buộc phải có asset_id"),
  preset_id: z.string().optional(),
  aspect_ratio: z.string().optional(),
  custom_note: z.string().optional(),
})

// product-photo/[id]/retry/route.ts
export const productPhotoRetryBody = z.object({
  retry_hint: z.string().optional(),
})

// product-image-set/route.ts
export const productImageSetBody = z.object({
  asset_id: z.string().min(1, "Bắt buộc phải có asset_id"),
  bundle_id: z.string().optional(),
  custom_note: z.string().optional(),
})

// product-change-requests/[id]/approve/route.ts
export const approveChangeRequestBody = z.object({ fields: z.array(z.string().min(1)).max(20).optional() }).nullable()

// product-change-requests/[id]/reject/route.ts
export const rejectChangeRequestBody = z.object({ reason: z.string().trim().min(1).max(500) })

// availability/blocks/route.ts
export const availabilityBlockBody = z.object({
  product_id: z.string().min(1).max(64),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  note: z.string().max(300).optional(),
})

// ── Chỉ mô tả ───────────────────────────────────────────────────────────────
export const changeRequestsQuery = z.object({ status: z.enum(["PENDING", "APPROVED", "PARTIAL", "REJECTED", "EXPIRED"]).optional() })
export const availabilityBoardQuery = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })
