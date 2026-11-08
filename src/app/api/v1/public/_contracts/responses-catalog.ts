import { z } from "zod"

/**
 * Phản hồi Catalog công khai `/public/catalog/{slug}` (audit API đợt 6). Route nằm trong vùng Catalog đóng
 * băng — lược đồ suy từ phản hồi thật (`tests/tenant/public-contract-catalog.test.ts`) và kiểu TS
 * `PublicCatalogResult` / `placePublicCatalogOrder`, không sửa mã Catalog.
 */
const timestamp = z.iso.datetime()

const catalogProduct = z.strictObject({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  shape: z.string().nullable(),
  container: z.string().nullable(),
  /** `null` = "Liên hệ để báo giá". */
  price: z.number().nullable(),
  imageUrl: z.string().nullable(),
  stemCount: z.number().nullable(),
  occasions: z.array(z.string()),
  description: z.string().nullable(),
})

const activeCatalog = z.strictObject({
  status: z.literal("ACTIVE"),
  catalog: z.strictObject({ slug: z.string(), name: z.string(), description: z.string().nullable(), createdAt: timestamp }),
  shop: z.strictObject({
    name: z.string(),
    legalName: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    address: z.string().nullable(),
    website: z.string().nullable(),
    primaryColor: z.string(),
    logoUrl: z.string().nullable(),
  }),
  products: z.array(catalogProduct),
  campaignConfig: z
    .strictObject({
      occasion: z.string().optional(),
      archetype: z.string().optional(),
      customHeroImageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      generatedPackage: z.record(z.string(), z.unknown()).optional(),
      enabledSections: z.record(z.string(), z.boolean()).optional(),
      styleVariant: z.string().optional(),
    })
    .optional(),
  customer: z.strictObject({ name: z.string().optional(), greeting: z.string().optional() }).optional(),
  /** Mã mẫu trình bày (`T01_…`) và phong cách (`S01_…`) của Catalog Studio. */
  templateId: z.string().optional(),
  styleId: z.string().optional(),
  /** Nút Đặt hàng / Liên hệ theo cài đặt của Điều hành. */
  entryActions: z.strictObject({ order: z.boolean(), contact: z.boolean() }).optional(),
  reviews: z.array(z.strictObject({ id: z.string(), author: z.string(), occasion: z.string(), rating: z.number(), comment: z.string() })).optional(),
})

/** Catalog đang mở, hoặc đã thu hồi (vẫn 200, chỉ trả tên). Không có → 404. */
export const publicCatalogResponse = z.union([activeCatalog, z.strictObject({ status: z.literal("REVOKED"), catalogName: z.string() })])

export const catalogLeadResponse = z.strictObject({ leadId: z.string() })

export const catalogOrderResponse = z.strictObject({
  orderCode: z.string(),
  totalVnd: z.number(),
  /** `true` khi mẫu chưa niêm yết giá — tiệm sẽ báo giá. */
  needsQuote: z.boolean(),
  /** Thông tin chuyển khoản khi tiệm bật VietQR và đơn có giá; ngược lại `null`. */
  payment: z.strictObject({ bankName: z.string().nullable(), accountNo: z.string(), accountName: z.string().nullable(), transferContent: z.string() }).nullable(),
})
