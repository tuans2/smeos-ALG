import { z } from "zod"

import { isKnownIndustryKey } from "@/modules/organization/domain/industry-profile"

import { shortLinkBodySchema } from "../short-links/schema"

/**
 * Lược đồ yêu cầu của hồ sơ và kênh cửa hàng: `/api/v1/business-profile/*`, `/api/v1/brand-profile`, `/api/v1/store/*`,
 * `/api/v1/store-share-link/*`, `/api/v1/shop-reviews/*`, `/api/v1/custom-domains/*`, `/api/v1/short-links/*` — OpenAPI
 * nội bộ, PO 07/11/2026. Lược đồ từng khai trong 8 route được chuyển NGUYÊN VĂN về đây và route import lại; thân link
 * động vẫn ở `short-links/schema.ts` (dùng chung POST/PATCH, xuất lại). Query chỉ để mô tả.
 */
export { shortLinkBodySchema }

// business-profile/route.ts
const jsonObject = z.record(z.string(), z.unknown()).nullable().optional()

export const putBusinessProfileBody = z.object({
  legal_name: z.string().nullable().optional(),
  display_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  social_links: jsonObject,
  tax_code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  brand_message: z.string().trim().max(500).nullable().optional(),
  target_customers: z.array(z.string().trim().min(1).max(80)).max(10).nullable().optional(),
  operating_hours: jsonObject,
})

// business-profile/mock-data/route.ts — mã ngành lạ từng được ghi thẳng vào settings.industry (rà soát lại cụm J, 23/10/2026)
export const industryMockDataBody = z
  .object({
    industry_key: z.string().refine(isKnownIndustryKey, "Ngành nghề không hợp lệ").optional(),
  })
  .optional()

// brand-profile/route.ts
const jsonField = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string()])
  .nullable()
  .optional()
const color = z.string().nullable().optional()

export const putBrandProfileBody = z.object({
  primary_color: color,
  secondary_color: color,
  accent_color: color,
  background_color: color,
  text_color: color,
  font_heading: z.string().nullable().optional(),
  font_body: z.string().nullable().optional(),
  logo_asset_id: z.string().nullable().optional(),
  tone_of_voice: z.string().nullable().optional(),
  hashtags: jsonField,
  cta_templates: jsonField,
  default_offers: jsonField,
  forbidden_styles: jsonField,
  brand_assets: jsonField,
  /** Câu khẩu hiệu — bỏ trống (không gửi) thì giữ giá trị đang lưu */
  slogan: z.string().trim().max(120).nullable().optional(),
})

// custom-domains/route.ts
export const addCustomDomainBody = z.object({ hostname: z.string().trim().min(1).max(300) })

// shop-reviews/route.ts
export const createReviewBody = z.object({
  author_name: z.string(),
  occasion: z.string().nullable().optional(),
  rating: z.number().int(),
  comment: z.string(),
  is_visible: z.boolean().optional(),
})

// shop-reviews/[id]/route.ts
export const patchReviewBody = z.object({
  author_name: z.string().optional(),
  occasion: z.string().nullable().optional(),
  rating: z.number().int().optional(),
  comment: z.string().optional(),
  is_visible: z.boolean().optional(),
})

// short-links/route.ts
export const createShortLinkBody = shortLinkBodySchema.extend({ kind: z.string().max(20) })

// ── Query — chỉ mô tả ────────────────────────────────────────────────────────
export const shortLinksQuery = z.object({ kind: z.string().optional(), limit: z.string().regex(/^-?\d+$/).optional(), cursor: z.string().optional() })
export const shortLinkStatsQuery = z.object({ days: z.string().optional() })
export const collectionTransparencyQuery = z.object({ storeId: z.string().optional() })
