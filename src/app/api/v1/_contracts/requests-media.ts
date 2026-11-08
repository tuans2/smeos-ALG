import { z } from "zod"

import { VARIANT_PRESET_IDS, VARIANT_RATIOS } from "@/modules/media/domain/variant-rules"

/**
 * Lược đồ yêu cầu của `/api/v1/media/*` — tối ưu ảnh (M04a), biến thể marketing (M04b) (OpenAPI nội bộ, PO 07/11/2026).
 * Lược đồ từng khai trong route được chuyển NGUYÊN VĂN về đây và route import lại; thân `POST /media/variants` là hợp
 * đồng Chặng 06c của Creative Studio.
 */
export { mediaVariantBodySchema } from "@/modules/creative-production/contracts/stage-06c-media"

// optimizations/route.ts
export const optimizationBody = z.object({
  asset_id: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
})

// promote-to-master/route.ts
export const promoteToMasterBody = z.object({
  asset_id: z.string().min(1, "Bắt buộc truyền ID ảnh ORIGINAL"),
})

// variants/[id]/approve/route.ts
export const approveVariantBody = z.object({ asset_id: z.string().min(1) })

// variants/batch/route.ts
const presetsSchema = z.union([z.literal("all"), z.array(z.enum(VARIANT_PRESET_IDS)).min(1)])
const ratiosSchema = z.union([z.literal("all"), z.array(z.enum(VARIANT_RATIOS)).min(1)])

export const variantBatchBody = z.object({
  master_asset_id: z.string().min(1),
  presets: presetsSchema.default("all"),
  ratios: ratiosSchema.default("all"),
  watermark: z.boolean().default(true),
  // AIC-14 — chốt 18/09 (AskUserQuestion): chỉ chỉnh vùng nền, mặc định tắt.
  auto_enhance: z.boolean().default(false),
  // Nợ #130e (Đợt 2, 25/09/2026): lấy cỡ cảnh / ánh sáng / bảng màu của ĐÚNG
  // cảnh trong kịch bản Chặng 05 cho cả lô. Bỏ trống = mặc định như Đợt 1.
  scene_plan_id: z.string().trim().min(1).max(160).optional(),
  scene_index: z.number().int().min(1).max(5).optional(),
})

/** `?limit=` của hai hàng chờ duyệt — số nguyên, use-case tự kẹp trong khoảng cho phép. */
export const pendingQueueQuery = z.object({ limit: z.string().regex(/^-?\d+$/).optional() })

/** `?ratio=` — một khung cụ thể; bỏ trống = ảnh MASTER. */
export const optimizationDownloadQuery = z.object({ ratio: z.string().optional() })

/** `?asset_id=` bắt buộc — một lượt có nhiều biến thể. */
export const variantDownloadQuery = z.object({ asset_id: z.string().min(1) })
