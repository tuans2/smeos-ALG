import { z } from "zod"

import { TEMPLATE_FAMILIES } from "@/modules/templates/domain/template-override-rules"

/**
 * Lược đồ yêu cầu nhóm công cụ: `/api/v1/ad-banner-poster/*`, `/api/v1/field-config/*`, `/api/v1/template-overrides/*`,
 * `/api/v1/noi-bo/*`, `/api/v1/proxy/*` — OpenAPI nội bộ, PO 07/11/2026. Lược đồ từng khai trong 4 route được chuyển
 * NGUYÊN VĂN về đây và route import lại; trường dữ liệu dùng lược đồ của `field-platform/adapters/http-schemas`
 * (xuất lại). Query chỉ để mô tả.
 */
export { createShopFieldSchema, updateShopFieldSchema } from "@/modules/field-platform/adapters/http-schemas"

// ad-banner-poster/copy/route.ts
export const bannerCopyBody = z.object({
  industry_key: z.string().default("GENERAL_RETAIL"),
  occasion_key: z.string().min(1, "Bắt buộc có occasion_key"),
  occasion_label: z.string().min(1, "Bắt buộc có occasion_label"),
  shop_name: z.string().min(1, "Bắt buộc có shop_name"),
  product_title: z.string().optional(),
  desired_promotion: z.string().optional(),
})

// ad-banner-poster/render/route.ts
export const bannerRenderBody = z.object({
  occasion_key: z.string(),
  occasion_label: z.string(),
  industry_key: z.string().default("GENERAL_RETAIL"),
  copy: z.object({
    headline: z.string().min(1),
    subHeadline: z.string().min(1),
    promotionBadge: z.string().min(1),
    ctaText: z.string().min(1),
    validityText: z.string().optional(),
  }),
  product_image_url: z.string().optional(),
  brand_info: z.object({
    shopName: z.string().min(1),
    hotline: z.string().optional(),
    address: z.string().optional(),
    logoUrl: z.string().optional(),
    primaryColor: z.string().optional(),
  }),
  style_preset_id: z.enum([
    "MODERN_MINIMAL",
    "VIBRANT_SALE",
    "ELEGANT_LUXURY",
    "FESTIVE_SEASON",
    "BRAND_ACCENT",
  ] as const),
  target_formats: z.array(z.enum(["1:1", "4:5", "9:16", "16:9", "A4"] as const)).min(1),
})

// ad-banner-poster/save/route.ts
export const bannerSaveBody = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").max(200),
  asset_type_code: z.string().min(1, "Mã loại asset không được để trống").max(20),
  image_data: z.string().min(1, "Dữ liệu hình ảnh không được để trống"),
  product_id: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// template-overrides/route.ts
export const putTemplateOverrideBody = z.object({
  template_family: z.enum(TEMPLATE_FAMILIES),
  template_key: z.string().min(1),
  field_key: z.string().min(1),
  value: z.string().min(1),
})

// ── Chỉ mô tả ───────────────────────────────────────────────────────────────
const ENTITY = z.enum(["ORDER", "PARTNER"])
export const fieldConfigQuery = z.object({ entity: ENTITY.optional() })
export const fieldCatalogsQuery = z.object({ keys: z.string().optional() })
export const templateOverridesQuery = z.object({ template_key: z.string() })
export const proxyQuery = z.object({ client: z.enum(["SOCIALFLOW", "LOCALBUDD"]) })
/** Thân chuyển nguyên văn sang hệ thống đích (không kiểm ở core). */
export const proxyBody = z.unknown()
