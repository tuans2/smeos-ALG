import { z } from "zod"

import { isValidDriveId } from "@/modules/greeting-card/adapters/google-drive-thumbnail"
import { commerceInputShape } from "@/modules/products/domain/product-commerce"
import { BULK_MAX_IDS } from "@/modules/products/domain/product-bulk"

/**
 * Lược đồ yêu cầu của sản phẩm `/api/v1/products/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ zod từng khai trong
 * route được chuyển NGUYÊN VĂN về đây và route import lại.
 */
export const PRODUCT_STATUS = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const
export const PROPOSAL_FILTERS = ["pending", "rejected", "expired"] as const

// products/route.ts
export const createProductBody = z.object({
  /** Để trống → máy chủ tự sinh mã `AUTO-…` (checklist ALG 2.1). */
  code: z.string().trim().max(64).optional(),
  name: z.string().min(1),
  branch_id: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  shape: z.string().min(1).nullable().optional(),
  facing: z.string().min(1).nullable().optional(),
  container: z.string().min(1).nullable().optional(),
  status: z.enum(PRODUCT_STATUS).optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  image_asset_id: z.string().min(1).nullable().optional(),
  ...commerceInputShape,
})

// products/[id]/route.ts
export const patchProductBody = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  branch_id: z.string().min(1).nullable().optional(),
  category: z.string().min(1).nullable().optional(),
  shape: z.string().min(1).nullable().optional(),
  facing: z.string().min(1).nullable().optional(),
  container: z.string().min(1).nullable().optional(),
  status: z.enum(PRODUCT_STATUS).optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  image_asset_id: z.string().min(1).nullable().optional(),
  availability_config: z.unknown().optional(),
  ...commerceInputShape,
})

// products/[id]/change-requests/route.ts
export const changeRequestBody = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).nullable().optional(),
  shape: z.string().min(1).nullable().optional(),
  facing: z.string().min(1).nullable().optional(),
  container: z.string().min(1).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  image_asset_id: z.string().min(1).nullable().optional(),
})

// products/[id]/reject/route.ts
export const rejectProductBody = z.object({ reason: z.string().trim().min(1).max(500) })

// products/batch-import/route.ts
export const batchImportItem = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  shape: z.string().nullable().optional(),
  facing: z.string().nullable().optional(),
  container: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  image_asset_id: z.string().nullable().optional(),
})

export const batchImportBody = z.object({
  items: z.array(batchImportItem).min(1).max(500),
  skip_duplicates: z.boolean().optional().default(true),
  overwrite_existing_images: z.boolean().optional().default(false),
  overwrite_existing: z.boolean().optional().default(false),
})

// products/bulk-status/route.ts
export const bulkStatusBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(BULK_MAX_IDS),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
})

// products/drive-thumbnails/route.ts
export const MAX_FOLDERS_PER_REQUEST = 50
export const driveThumbnailsBody = z.object({
  folder_ids: z.array(z.string().refine(isValidDriveId, "folder_id không hợp lệ")).min(1).max(MAX_FOLDERS_PER_REQUEST),
})

// products/one-image-kit/route.ts và one-image-kit/run/route.ts
export const oneImageKitBody = z.object({ asset_id: z.string().uuid() })
export const oneImageKitQuery = z.object({ job_id: z.string().uuid(), asset_id: z.string().uuid() })
export const oneImageKitRunBody = z.object({ analysis_id: z.string().uuid() })

// ── Query (route tự đọc `searchParams`) ──────────────────────────────────────────────────────────────────
export const listProductsQuery = z.object({
  branch_id: z.string().optional(),
  status: z.enum(PRODUCT_STATUS).optional(),
  category: z.string().optional(),
  occasion_code: z.string().optional(),
  color: z.string().optional(),
  collection: z.string().optional(),
  price_min: z.string().optional(),
  price_max: z.string().optional(),
  search: z.string().optional(),
  proposal: z.enum(PROPOSAL_FILTERS).optional(),
  /** Lọc toàn kho (quét tối đa 3.000 mẫu): mã dịp của bộ lọc giao diện, `all` = bỏ lọc. */
  occasion: z.string().optional(),
  /** Khoảng giá của bộ lọc giao diện; `custom` dùng `price_min`/`price_max`. */
  price_range: z.string().optional(),
  sort: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  cursor: z.string().optional(),
})
export const exportProductsQuery = z.object({ status: z.enum(PRODUCT_STATUS).optional(), category: z.string().optional(), search: z.string().optional() })
export const masterIndexQuery = z.object({ limit: z.string().regex(/^\d+$/).optional() })
