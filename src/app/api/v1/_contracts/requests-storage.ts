import { z } from "zod"

import type { AssetUsageStatus } from "@/modules/marketing-center/domain/asset-usage"
import { TRASH_ITEM_TYPES } from "@/modules/storage/domain/trash-types"

/**
 * Lược đồ yêu cầu của `/api/v1/assets/*` (tư liệu ảnh/video), `/api/v1/asset-usages/*` (nơi dùng tư liệu —
 * Trung tâm Marketing) và `/api/v1/storage/*` (kho tệp, thùng rác, Kho dữ liệu v2) — OpenAPI nội bộ, PO 07/11/2026.
 * Lược đồ từng khai trong 5 route được chuyển NGUYÊN VĂN về đây (kèm hai danh sách giá trị route dùng chung với query)
 * và route import lại; thân `POST /assets` là hợp đồng Chặng 01 của Creative Studio. Query chỉ để mô tả.
 */
export { registerAssetBodySchema } from "@/modules/creative-production/contracts/stage-01-bring"

// assets/upload-url/route.ts
export const uploadUrlBody = z.object({
  product_id: z.string().nullish(),
  mime_type: z.string().min(1),
})

// asset-usages/route.ts — giá trị theo enum `usage_destination` / `usage_status` của lược đồ CSDL.
export const USAGE_DESTINATION_VALUES = ["PROMOTION", "SALES", "CARE", "PRINT", "OTHER"] as const
export const USAGE_STATUS_VALUES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const satisfies readonly AssetUsageStatus[]

export const createUsageSchema = z.object({
  source_type: z.string().min(1, "source_type không được để trống"),
  source_id: z.string().min(1, "source_id không được để trống"),
  asset_type_code: z.string().min(1, "asset_type_code không được để trống"),
  destination: z.enum(USAGE_DESTINATION_VALUES),
  cta_code: z.enum([
    "LEARN_MORE",
    "CONTACT",
    "REQUEST_INFO",
    "REQUEST_QUOTE",
    "ORDER",
    "PAY",
    "REVIEW",
    "REFER",
  ]),
  title: z.string().min(1, "Tên nơi dùng không được để trống").max(200),
  channel_id: z.string().optional(),
  target_path: z.string().optional(),
  campaign_id: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

// asset-usages/[id]/route.ts
export const updateUsageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  cta_code: z.enum([
    "LEARN_MORE",
    "CONTACT",
    "REQUEST_INFO",
    "REQUEST_QUOTE",
    "ORDER",
    "PAY",
    "REVIEW",
    "REFER",
  ]).optional(),
  destination: z.enum(["PROMOTION", "SALES", "CARE", "PRINT", "OTHER"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

// storage/trash/route.ts
export const moveTrashSchema = z.object({
  id: z.string().min(1),
  type: z.enum(TRASH_ITEM_TYPES),
})

// storage/trash/[id]/restore/route.ts
export const restoreSchema = z.object({
  type: z.enum(TRASH_ITEM_TYPES),
})

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
const int = z.string().regex(/^-?\d+$/)
export const assetsQuery = z.object({
  product_id: z.string().optional(),
  kind: z.string().optional(),
  approval_state: z.string().optional(),
  parent_asset_id: z.string().optional(),
  limit: int.optional(),
  cursor: z.string().optional(),
})
export const usagesQuery = z.object({
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  destination: z.enum(USAGE_DESTINATION_VALUES).optional(),
  status: z.enum(USAGE_STATUS_VALUES).optional(),
  limit: int.optional(),
})
export const trashTypeQuery = z.object({ type: z.enum(TRASH_ITEM_TYPES) })
export const libraryQuery = z.object({
  type: z.string(),
  scope: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  cursor: z.string().optional(),
})
export const libraryScopeQuery = z.object({ scope: z.string().optional() })
/** URL ký do `/assets/upload-url` hoặc `/assets/:id/view-url` trả — không tự dựng. */
export const signedUrlQuery = z.object({ exp: int, sig: z.string() })
