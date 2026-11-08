import { z } from "zod"

import { LIBRARY_TYPES } from "@/modules/storage/domain/library"
import { TRASH_ITEM_TYPES } from "@/modules/storage/domain/trash-types"

import { USAGE_DESTINATION_VALUES, USAGE_STATUS_VALUES } from "./requests-storage"

/**
 * Phản hồi `/api/v1/assets/*`, `/api/v1/asset-usages/*`, `/api/v1/storage/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ
 * dòng `assets` (Prisma) và kiểu TS của `storage` (list-library, trash-types) và `marketing-center` (asset-usage), đối
 * chiếu mẫu ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-storage.test.ts`. Mọi URL tệp là URL ký có
 * hạn (`/api/v1/storage/<khoá>?exp=&sig=`) — không phát URL không ký.
 */
const timestamp = z.iso.datetime()
const signedUrl = z.string()

/** Dòng `assets` nguyên bản. */
const assetRow = z.strictObject({
  id: z.string(),
  organization_id: z.string(),
  product_id: z.string().nullable(),
  parent_asset_id: z.string().nullable(),
  kind: z.enum(["ORIGINAL", "ANALYZED", "ENHANCED", "MASTER", "MARKETING", "CATALOG", "LANDING", "SOCIAL", "VIDEO", "RATIO"]),
  state: z.enum(["PROCESSING", "READY", "FAILED", "ARCHIVED"]),
  version: z.number(),
  storage_key: z.string(),
  thumb_key: z.string().nullable(),
  mime_type: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  aspect_ratio: z.string().nullable(),
  file_size: z.number().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  model_version: z.string().nullable(),
  pipeline_version: z.string().nullable(),
  parameters: z.unknown().nullable(),
  prompt: z.string().nullable(),
  input_sha256: z.string().nullable(),
  output_sha256: z.string().nullable(),
  quality_score: z.number().nullable(),
  identity_score: z.number().nullable(),
  generated_flags: z.unknown().nullable(),
  cost_usd: z.number().nullable(),
  approval_state: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  approved_by: z.string().nullable(),
  approved_at: timestamp.nullable(),
  metadata: z.unknown().nullable(),
  created_by: z.string(),
  created_at: timestamp,
  trashed_at: timestamp.nullable(),
  purge_after: timestamp.nullable(),
  legal_hold_until: timestamp.nullable(),
  updated_at: timestamp,
})
/** Đọc một asset / ghi nhận trả dòng gốc; duyệt trả thêm URL ký để hiển thị ngay. */
export const assetResponse = z.strictObject({ asset: assetRow.extend({ url: signedUrl.optional(), image_url: signedUrl.optional() }) })
/** Danh sách kèm URL ký và tên sản phẩm gắn với asset (nếu có). */
export const assetsResponse = z.strictObject({
  data: z.array(assetRow.extend({ url: signedUrl.nullable(), image_url: signedUrl.nullable(), name: z.string().nullable(), product_name: z.string().nullable() })),
  next_cursor: z.string().nullable(),
})
/** URL ký PUT, hết hạn sau `expires_in` giây — client tải thẳng lên kho rồi gọi `POST /assets`. */
export const uploadUrlResponse = z.strictObject({ asset_id: z.string(), storage_key: z.string(), upload_url: signedUrl, expires_in: z.number() })
export const viewUrlResponse = z.strictObject({ asset_id: z.string(), url: signedUrl, expires_in: z.number() })
/** `PUT /storage/{key}` — envelope cũ `{ ok, key }`. */
export const uploadedResponse = z.strictObject({ ok: z.literal(true), key: z.string() })

const usage = z.strictObject({
  id: z.string(),
  organizationId: z.string(),
  sourceType: z.string(),
  sourceId: z.string(),
  assetTypeCode: z.string(),
  destination: z.enum(USAGE_DESTINATION_VALUES),
  ctaCode: z.string(),
  title: z.string(),
  shortLinkId: z.string().nullable(),
  campaignId: z.string().nullable(),
  config: z.record(z.string(), z.unknown()),
  status: z.enum(USAGE_STATUS_VALUES),
  createdBy: z.string(),
  createdAt: timestamp,
  updatedAt: timestamp,
})
/** Kênh link/QR tạo kèm short link (`shortLink`). */
export const usageCreatedResponse = z.strictObject({
  data: z.strictObject({ usage, shortLink: z.strictObject({ id: z.string(), code: z.string(), targetPath: z.string() }).optional() }),
})
export const usagesResponse = z.strictObject({ data: z.array(usage) })
export const usageResponse = z.strictObject({ data: usage })

export const trashResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      type: z.enum(TRASH_ITEM_TYPES),
      name: z.string(),
      code: z.string().nullable().optional(),
      imageUrl: signedUrl.nullable().optional(),
      trashedAt: timestamp,
      trashedBy: z.string().nullable().optional(),
      /** Hết hạn giữ (30 ngày) — sau đó xoá vĩnh viễn tự động. */
      expiresAt: timestamp,
      daysRemaining: z.number(),
      priceVnd: z.number().nullable().optional(),
      category: z.string().nullable().optional(),
    })
  ),
})
/** Envelope cũ `{ success: true }` (`api-envelope-legacy.txt`). */
export const successResponse = z.strictObject({ success: z.literal(true) })

const branchRef = z.strictObject({ id: z.string(), name: z.string() })
export const libraryResponse = z.strictObject({
  data: z.strictObject({
    items: z.array(
      z.strictObject({
        id: z.string(),
        type: z.enum(LIBRARY_TYPES),
        subtype: z.string().nullable(),
        title: z.string(),
        status: z.string().nullable(),
        created_at: timestamp,
        branch: branchRef.nullable(),
        thumbnail_url: signedUrl.nullable(),
        /** Ảnh dự phòng trên Google Drive. */
        drive_link: z.string().nullable(),
        /** Màn mở mục này trong ứng dụng. */
        open_href: z.string(),
        asset_type: z.strictObject({ code: z.string(), name: z.string(), module: z.string() }).nullable().optional(),
      })
    ),
    next_cursor: z.string().nullable(),
  }),
})
export const librarySummaryResponse = z.strictObject({
  data: z.strictObject({
    /** Loại dữ liệu người xem có quyền. */
    types: z.array(z.enum(LIBRARY_TYPES)),
    counts: z.partialRecord(z.enum(LIBRARY_TYPES), z.number()),
    is_chain: z.boolean(),
    viewer_branch_id: z.string().nullable(),
    branches: z.array(branchRef),
  }),
})
