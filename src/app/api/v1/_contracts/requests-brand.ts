import { z } from "zod"

import { BRAND_LIBRARY_CATEGORIES } from "@/modules/profiles/domain/brand-library"

/**
 * Lược đồ yêu cầu của `/api/v1/brand-kit/*` (mục Thương hiệu 3 bước), `/api/v1/brand-library/*` (thư viện nhận diện)
 * và `/api/v1/product-copies/*` (dữ liệu bán hàng M01b) — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong 5 route
 * được chuyển NGUYÊN VĂN về đây và route import lại (Bộ nhận diện và Landing page dùng chung một lược đồ giống hệt).
 * Thân `product-copies` do route/use-case tự kiểm — lược đồ ở đây chỉ MÔ TẢ, khớp hàm kiểm nhờ
 * `tests/unit/architecture/internal-request-parity.test.ts`.
 */

// brand-kit/identity-options/route.ts, brand-kit/landing-options/route.ts
export const brandOptionsBody = z.object({ mode: z.enum(["initial", "extra", "refresh"]) })

// brand-library/route.ts
export const createBrandLibraryBody = z.object({
  title: z.string(),
  category: z.enum(BRAND_LIBRARY_CATEGORIES),
  description: z.string().nullish(),
  asset_id: z.string().uuid().nullish(),
  text_value: z.string().nullish(),
  note: z.string().nullish(),
})

// brand-library/[id]/route.ts
export const patchBrandLibraryBody = z.object({
  title: z.string().optional(),
  description: z.string().nullish(),
  share_with_members: z.boolean().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
})

// brand-library/[id]/versions/route.ts
export const brandLibraryVersionBody = z.object({
  asset_id: z.string().uuid().nullish(),
  text_value: z.string().nullish(),
  note: z.string().nullish(),
})

// ── Chỉ mô tả — route/use-case tự kiểm ───────────────────────────────────────
/** Trường được sửa trong `edited` — khớp danh sách của `validateProductCopyEdited` (`product-copy-rules.ts`). */
export const PRODUCT_COPY_EDITED_KEYS_DOC = [
  "suggested_name",
  "short_headline",
  "suggested_description",
  "suggested_style",
  "suggested_tags",
  "seo_keywords",
  "suggested_occasions",
  "secondary_occasions",
  "target_audience",
  "flower_meaning_story",
  "key_selling_points",
  "card_message_suggestions",
  "care_instructions",
  "suggested_price_segment",
  "suggested_price_range",
  "recommended_upsells",
] as const
export const productCopyEditedSchema = z.strictObject(Object.fromEntries(PRODUCT_COPY_EDITED_KEYS_DOC.map((k) => [k, z.unknown().optional()])))
/** `product-copies/[id]` PATCH: thiếu `edited` hoặc có trường lạ → 400. */
export const patchProductCopyBody = z.object({ edited: productCopyEditedSchema })
/** `product-copies/generate` POST: kèm header `Idempotency-Key` bắt buộc. */
export const generateProductCopyBody = z.object({ analysisId: z.string(), productId: z.string().nullish() })
/** `product-copies/[id]/reject` POST: thân tuỳ chọn. */
export const rejectProductCopyBody = z.object({ reason: z.string().nullish() })

export const brandLibraryQuery = z.object({ include_archived: z.enum(["true", "false"]).optional() })
export const productCopiesQuery = z.object({ product_id: z.string().optional(), approval_state: z.string().optional() })
