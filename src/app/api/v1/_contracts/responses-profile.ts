import { z } from "zod"

/**
 * Phản hồi hồ sơ & kênh cửa hàng (OpenAPI nội bộ, PO 07/11/2026): `business-profile`, `brand-profile`, `store`,
 * `store-share-link`, `shop-reviews`, `custom-domains`, `short-links`. Sinh từ kiểu TS của `profiles`, `field-platform`,
 * `custom-domain`, `shop-reviews`, `acquisition` (dòng `short_links`), đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-profile.test.ts`.
 */
const timestamp = z.iso.datetime()
const data = <T extends z.ZodType>(schema: T) => z.strictObject({ data: schema })
const text = z.string().nullable()
const json = z.unknown().nullable()

/** Không bọc `{ data }`; chưa có hồ sơ → `null`. */
export const businessProfileResponse = z
  .strictObject({
    legal_name: text,
    display_name: z.string(),
    phone: text,
    email: text,
    address: text,
    website: text,
    social_links: json,
    tax_code: text,
    description: text,
    operating_hours: json,
    brand_message: text,
    target_customers: z.array(z.string()).nullable(),
  })
  .nullable()
export const mockDataResponse = z.strictObject({
  data: z.strictObject({ industryKey: z.string(), industryName: z.string(), businessName: z.string(), productsCount: z.number() }),
})
/** Không bọc `{ data }`. `logo_url` là URL ký có hạn của ảnh logo. */
export const brandProfileResponse = z.strictObject({
  primary_color: text,
  secondary_color: text,
  accent_color: text,
  background_color: text,
  text_color: text,
  font_heading: text,
  font_body: text,
  logo_asset_id: text,
  logo_url: text,
  tone_of_voice: text,
  hashtags: json,
  cta_templates: json,
  default_offers: json,
  forbidden_styles: json,
  brand_assets: json,
  slogan: text,
})
const PROPAGATION = z.enum(["NONE", "MASKED", "AGGREGATED", "RAW"])
/** Không có chi nhánh đang hoạt động → `storeId: ""`, `items: []`. */
export const transparencyResponse = data(
  z.strictObject({
    storeId: z.string(),
    storeName: z.string(),
    profileVersion: z.number(),
    items: z.array(
      z.strictObject({
        fieldKey: z.string(),
        fieldNameVi: z.string(),
        domain: z.string(),
        sensitivity: z.string(),
        effectiveFloor: PROPAGATION,
        effectiveCeiling: PROPAGATION,
        effectiveTarget: PROPAGATION,
        purpose: z.string().optional(),
        isMandatory: z.boolean(),
      })
    ),
  })
)

/** Chưa có link đang hoạt động → `data: null`. */
export const shareLinkResponse = data(z.strictObject({ slug: z.string(), path: z.string(), view_count: z.number(), created_at: timestamp }).nullable())
export const shareLinkRevokedResponse = z.strictObject({ revoked: z.literal(true) })

const review = z.strictObject({
  id: z.string(),
  authorName: z.string(),
  occasion: z.string().nullable(),
  rating: z.number(),
  comment: z.string(),
  isVisible: z.boolean(),
  createdAt: timestamp,
})
export const reviewsResponse = data(z.array(review))
export const reviewResponse = data(review)
export const reviewRemovedResponse = data(z.strictObject({ id: z.string() }))

const domain = z.strictObject({
  id: z.string(),
  hostname: z.string(),
  status: z.enum(["PENDING", "VERIFIED", "LOCKED"]),
  statusText: z.string(),
  certificateStatus: z.enum(["NOT_REQUESTED", "REQUESTED", "MANUAL", "FAILED"]),
  verifiedAt: timestamp.nullable(),
  lastCheckedAt: timestamp.nullable(),
  lockedReason: z.string().nullable(),
  /** Bản ghi DNS cần thêm: TXT xác minh, CNAME trỏ về trang (khi nền tảng đã cấu hình đích). */
  records: z.array(z.strictObject({ type: z.enum(["TXT", "CNAME"]), name: z.string(), value: z.string(), purpose: z.string() })),
})
export const domainsResponse = data(z.array(domain))
export const domainResponse = data(domain)
export const domainVerifyResponse = data(z.strictObject({ verified: z.boolean(), message: z.string(), domain }))
export const domainRemovedResponse = data(z.strictObject({ removed: z.literal(true) }))

/** Dòng `short_links` nguyên bản kèm `_count.leads` (trường đếm của Prisma lọt ra API — audit API §24). */
const shortLink = z.strictObject({
  id: z.string(),
  code: z.string(),
  kind: z.enum(["QR", "SALES_LINK"]),
  name: z.string(),
  target_path: z.string(),
  placement_label: text,
  utm_source: text,
  utm_medium: text,
  utm_campaign: text,
  expires_at: timestamp.nullable(),
  is_active: z.boolean(),
  scan_count: z.number(),
  created_at: timestamp,
  updated_at: timestamp,
  _count: z.strictObject({ leads: z.number() }),
})
/** Không bọc `{ data }`. */
export const shortLinkResponse = shortLink
export const shortLinksResponse = z.strictObject({ items: z.array(shortLink), nextCursor: z.string().nullable() })
export const shortLinkStatsResponse = z.strictObject({
  link: shortLink,
  days: z.number(),
  totalScans: z.number(),
  uniqueVisitors: z.number(),
  leads: z.number(),
  /** Thiết bị → số lượt quét. */
  byDevice: z.record(z.string(), z.number()),
  /** Ngày `YYYY-MM-DD` → số lượt quét. */
  byDay: z.record(z.string(), z.number()),
})
