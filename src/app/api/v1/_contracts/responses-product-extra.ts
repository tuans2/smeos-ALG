import { z } from "zod"

import { jobCreatedResponse } from "./responses-ai-studio"
import { productRow } from "./responses-products"

/**
 * Phản hồi nhóm sản phẩm phụ (OpenAPI nội bộ, PO 07/11/2026): `product-photo`, `product-image-set`,
 * `product-change-requests`, `availability`. Sinh từ kiểu TS của `product-photo-studio`, `product-image-set`, `products`
 * (`product-change-requests`), `availability`, đối chiếu mẫu ghi từ phản hồi thật rồi kiểm ở
 * `tests/tenant/internal-contract-product-extra.test.ts`. Không bọc `{ data }` trừ hàng chờ đề xuất sửa.
 */
export { jobCreatedResponse }
const timestamp = z.iso.datetime()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Danh mục tĩnh; `promptDirective` là câu lệnh gửi mô hình ảnh. */
export const photoCatalogResponse = z.strictObject({
  presets: z.array(z.strictObject({ id: z.string(), name: z.string(), description: z.string(), promptDirective: z.string(), colorHex: z.string().optional() })),
  aspect_ratios: z.array(z.strictObject({ id: z.string(), label: z.string(), ratio: z.string(), description: z.string() })),
})
const qcItem = z.strictObject({ code: z.string(), score: z.number(), passed: z.boolean(), reason: z.string().optional() })
/** Job chưa xong và chưa có điểm → mọi tiêu chí mặc định 1 (`passed: true`); chỉ `canApprove` mới phản ánh trạng thái. */
export const photoResultResponse = z.strictObject({
  jobId: z.string(),
  status: z.string(),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  result: z.string().nullable(),
  originalUrl: z.string().nullable(),
  masterUrl: z.string().nullable(),
  /** Tỉ lệ khung → URL ký có hạn. */
  ratioUrls: z.record(z.string(), z.string()),
  qcEvaluation: z.strictObject({
    passed: z.boolean(),
    overallScore: z.number(),
    mandatoryPassed: z.boolean(),
    failedCriteria: z.array(z.string()),
    retryHint: z.string().nullable(),
    items: z.array(qcItem),
  }),
  canApprove: z.boolean(),
  promptUsed: z.string().optional(),
  presetId: z.string().optional(),
})

export const imageSetCatalogResponse = z.strictObject({
  bundles: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      isDefault: z.boolean().optional(),
      variants: z.array(
        z.strictObject({
          id: z.string(),
          name: z.string(),
          aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]),
          angle: z.enum(["front", "angle_15", "angle_30", "top_down", "close_up"]),
          angleLabel: z.string(),
          channelTarget: z.enum(["Catalog", "Bài đăng MXH", "Story / Reels", "Chi tiết SP"]),
          promptDirective: z.string(),
        })
      ),
    })
  ),
})
/** Job chưa xong → `url` mỗi biến thể là ảnh gốc và điểm QC là giá trị mặc định (audit API §28). */
export const imageSetResultResponse = z.strictObject({
  jobId: z.string(),
  status: z.string(),
  stage: z.string().nullable(),
  error: z.string().nullable(),
  originalUrl: z.string().nullable(),
  bundleName: z.string(),
  variants: z.array(
    z.strictObject({ id: z.string(), name: z.string(), channelTarget: z.string(), aspectRatio: z.string(), angleLabel: z.string(), url: z.string(), passed: z.boolean() })
  ),
  qcEvaluation: z.strictObject({
    passed: z.boolean(),
    setConsistencyScore: z.number(),
    overallScore: z.number(),
    variantScores: z.array(
      z.strictObject({
        variantId: z.string(),
        scores: z.record(z.string(), z.number()),
        passed: z.boolean(),
        failedCriteria: z.array(z.string()),
        retryHint: z.string().optional(),
      })
    ),
  }),
})

const CR_STATUS = z.enum(["PENDING", "APPROVED", "PARTIAL", "REJECTED", "EXPIRED"])
export const changeRequestsResponse = z.strictObject({
  data: z.array(
    z.strictObject({
      id: z.string(),
      productId: z.string(),
      productName: z.string(),
      productCode: z.string(),
      proposedBy: z.string(),
      /** Trường → giá trị đề xuất (chỉ các trường khác bản gốc lúc gửi). */
      changes: z.record(z.string(), z.unknown()),
      fields: z.array(z.strictObject({ key: z.string(), label: z.string() })),
      status: CR_STATUS,
      /** Lý do từ chối. */
      note: z.string().nullable(),
      createdAt: timestamp,
      expiresAt: timestamp,
    })
  ),
})
/** Dòng `products` sau khi áp đề xuất. */
export const changeRequestApprovedResponse = productRow
export const changeRequestRejectedResponse = z.strictObject({ id: z.string(), status: z.literal("REJECTED") })

const opt = <T extends z.ZodType>(s: T) => s.nullable().optional()
export const boardResponse = z.strictObject({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  fromDate: date,
  toDate: date,
  days: z.array(date),
  products: z.array(
    z.strictObject({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      category: z.string().nullable(),
      status: z.string(),
      mode: z.string(),
      config: z.unknown(),
      inventoryStatus: z.string().optional(),
      quantityAvailable: opt(z.number()),
    })
  ),
  /** Đặt chỗ từ đơn và chặn thủ công (không gắn đơn → các trường đơn `null`). */
  bookings: z.array(
    z.strictObject({
      id: z.string(),
      productId: z.string(),
      productName: z.string(),
      orderId: opt(z.string()),
      orderCode: opt(z.string()),
      customerName: opt(z.string()),
      customerPhone: opt(z.string()),
      checkInDate: date,
      checkOutDate: date,
      note: opt(z.string()),
      status: z.enum(["ACTIVE", "CANCELLED"]),
      createdAt: z.string(),
      orderStatus: opt(z.string()),
      totalVnd: opt(z.number()),
      paidVnd: opt(z.number()),
      checkInTimeSlot: opt(z.string()),
    })
  ),
  industryKey: opt(z.string()),
})
export const blockCreatedResponse = z.strictObject({ id: z.string(), success: z.literal(true) })
export const successResponse = z.strictObject({ success: z.literal(true) })
