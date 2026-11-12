/**
 * Hợp đồng HTTP của `/api/v1/coordinator/*` (Chức năng 12). Route chỉ gọi
 * `parseBody` — body sai trả 400 `VALIDATION_FAILED` kèm `issues`, không phải
 * 500 như bản trước (`schema.parse` ném `ZodError` ra `handle()`).
 */

import { z } from "zod"

import { validationFailed } from "@/core/http/errors"
import { COORDINATOR_ENTRY_SOURCES } from "@/modules/orders/domain/order-source"
import { COORDINATOR_STAGES } from "../domain/stage-transitions"
import { EXCEPTION_SEVERITIES, EXCEPTION_TYPES } from "../domain/operation-rules"

export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return parsed.data
}

const text = (max: number) => z.string().trim().max(max)
const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max)
const id = z.string().trim().min(1).max(64)

/**
 * URL ảnh mẫu từ Product Master / catalog. Cấm `data:` — bản trước nhét ảnh
 * base64 vài MB vào `metadata` của đơn. Ảnh tải lên đi qua `assets` (`sampleAssetId`).
 */
const externalImageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v) || v.startsWith("/"), "Chỉ nhận URL http(s) hoặc đường dẫn nội bộ; ảnh tải lên dùng sampleAssetId")

export const stageSchema = z.enum(COORDINATOR_STAGES as [string, ...string[]])

export const listQuerySchema = z.object({
  stage: stageSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

// ĐP-1.2 (26/09/2026): trước đây `addressSchema` là z.union cho phép gửi MỘT
// CHUỖI duy nhất, bị `.transform` gói lại thành `{ formattedAddress }` — một
// đơn tạo kiểu này không có street/ward/district/city, phá nguyên tắc "địa chỉ
// giao bắt buộc chia nhiều tầng" (Q4, PO 26/09/2026). Nhánh chuỗi bị bỏ: từ
// nay `POST /api/v1/coordinator/orders` CHỈ nhận object 4 tầng. Đơn CŨ trong
// DB có `delivery_address` chỉ gồm `formattedAddress` (hoặc chuỗi thô) vẫn
// ĐỌC được bình thường — chiều đọc (`order-view.ts`, `present-coordinator-order.ts`)
// giữ nguyên kiểu `unknown`, không đụng tới dữ liệu cũ.
const addressSchema = z.object({
  street: requiredText(200, "Thiếu số nhà, tên đường"),
  ward: requiredText(100, "Thiếu phường/xã"),
  district: requiredText(100, "Thiếu quận/huyện"),
  city: requiredText(100, "Thiếu tỉnh/thành phố"),
  country: text(100).optional(),
  formattedAddress: text(500).optional(),
})

const demUnitSchema = z.enum(["bông", "cành", "lá", "cây"])
const flowerRoleSchema = z.enum(["Chủ đạo", "Phụ", "Điểm xuyến", "Lấp đầy"])

export const createOrderSchema = z.object({
  customerId: id.optional(),
  // ĐP-2.6 (26/09/2026): khi có, máy chủ đọc Product Master Index và ghi
  // snapshot (xem `use-cases/create-coordinator-order.ts`). Tuỳ chọn — vẫn
  // tạo được đơn mẫu ngoài danh mục bằng `productTitle` + `flowers` nhập tay.
  productId: id.optional(),
  customerName: requiredText(200, "Thiếu tên khách hàng"),
  customerTier: z.enum(["NEW", "BRONZE", "SILVER", "GOLD", "VIP"]).default("NEW"),
  // ĐP-1.3 (26/09/2026): SĐT của khách MUA (khác `recipientPhone` là SĐT người
  // NHẬN hoa). Trước bản này, form có ô nhập nhưng giá trị không nằm trong
  // schema nên bị lặng lẽ bỏ ở phía máy chủ. Với khách lẻ (không có `customerId`
  // trỏ vào CMI), số này là nơi lưu duy nhất, ở `order_coordinations.metadata`.
  customerPhone: text(20).optional(),
  recipientName: requiredText(200, "Thiếu tên người nhận"),
  recipientPhone: z.string().trim().regex(/^\+?[0-9 .-]{8,15}$/, "Số điện thoại người nhận không hợp lệ"),
  deliveryAddress: addressSchema,
  deliveryTargetTime: requiredText(100, "Thiếu khung giờ giao"),
  deliveryTargetAt: z.string().datetime({ offset: true }).optional(),
  productTitle: requiredText(300, "Thiếu tên sản phẩm hoa"),
  sampleImageUrl: externalImageUrl.optional(),
  sampleAssetId: id.optional(),
  unitPriceVnd: z.number().nonnegative().max(1_000_000_000).default(0),
  // ĐP-2.13 (26/09/2026): `unit`/`role` xưa nhận CHUỖI TỰ DO — đơn tạo qua
  // form vẫn gửi đúng danh mục nhưng API không ép, nên một client khác (AI
  // Chat M10, tích hợp ngoài) có thể gửi giá trị ngoài danh mục mà không ai
  // biết. Từ nay CHỈ nhận đúng `DemUnit` (hợp đồng Vision) và 4 vai trò hoa.
  // Đơn CŨ trong DB có giá trị ngoài danh mục vẫn ĐỌC được bình thường — tầng
  // đọc (`present-coordinator-order.ts`) giữ kiểu `string`, không ép lại.
  flowers: z
    .array(
      z.object({
        flowerName: requiredText(120, "Thiếu tên hoa"),
        quantity: z.number().int().positive().max(10_000),
        unit: demUnitSchema.default("cành"),
        color: text(60).default(""),
        role: flowerRoleSchema.default("Phụ"),
      })
    )
    .max(100)
    .default([]),
  cardMessage: text(1000).optional(),
  // ĐP-4a.1 (26/09/2026): `cardMessage` bắt buộc khi `cardRequired = true`
  // (kiểm ở `.superRefine` dưới, vì phụ thuộc lẫn nhau giữa 2 trường).
  cardRequired: z.boolean().default(false),
  internalNote: text(2000).optional(),
  // ĐP-4a.1 (26/09/2026), Đặc tả trường §2.1/§3.1 — mã chuỗi kiểm theo danh
  // mục (D12), kiểm active thật ở use-case (`validate-catalog-code.ts`) vì
  // zod thuần không gọi DB. `priority` để trống thì máy TỰ GỢI Ý (§2.15.1).
  // PO 07/11/2026 (Q2, audit BL-06): nguồn theo danh mục chung `order-source.ts`, ghi cả `orders.source`
  source: z.enum(COORDINATOR_ENTRY_SOURCES).optional(),
  sourceReference: text(200).optional(),
  channel: text(60).optional(),
  orderType: text(60).optional(),
  priority: text(60).optional(),
  serviceLevel: text(60).optional(),
  deliveryType: text(60).optional(),
  deliveryLocationType: text(60).optional(),
  receivedAt: z.string().datetime({ offset: true }).optional(),
  deliveryWindowStart: z.string().datetime({ offset: true }).optional(),
  deliveryWindowEnd: z.string().datetime({ offset: true }).optional(),
  // ĐP-3.16 (26/09/2026): giá trị trường tự tạo (entity ORDER) — `applyCustomFields`
  // (field-platform) kiểm lại theo đúng định nghĩa đang ACTIVE, khoá lạ bị bỏ qua.
  customFields: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  if (data.cardRequired && !data.cardMessage?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cardMessage"],
      message: "Thiếu lời thiệp — bắt buộc khi có yêu cầu thiệp/băng rôn",
    })
  }
})

/** `PATCH /api/v1/coordinator/orders/:id/custom-fields` (R3, ĐP-3.16). */
export const updateCustomFieldsSchema = z.object({
  customFields: z.record(z.string(), z.unknown()),
})

/**
 * `POST /api/v1/coordinator/orders/:id/payments` (ĐP-4a, 26/09/2026, PO D2).
 * `kind = REFUND` đòi R10 (trần cứng điều hành) — kiểm ở route, không ở đây.
 * Danh mục `paymentMethod` §2.15.7 — MỞ, chưa xiết enum cứng (đúng D12: cột
 * lưu mã chuỗi, quản trị nền tảng sửa danh mục được mà không cần migration).
 */
export const recordPaymentSchema = z.object({
  kind: z.enum(["DEPOSIT", "BALANCE", "REFUND"]),
  amountVnd: z.number().positive().max(1_000_000_000),
  paymentMethod: text(40).optional(),
  reference: text(200).optional(),
  evidenceAssetId: id.optional(),
  note: text(1000).optional(),
})

export const updateStageSchema = z.object({
  stage: stageSchema,
  nextAction: text(300).optional(),
})

export const assignPartnerSchema = z.object({
  partnerId: id,
  notes: text(1000).optional(),
  overrideCapacity: z.boolean().optional(),
  agreedCraftFeeVnd: z.number().int().nonnegative().max(1_000_000_000).optional(),
})

export const productionUpdateSchema = z.object({
  action: z.enum(["UPDATE_PROGRESS", "MARK_READY", "REPORT_MATERIAL_ISSUE"]),
  progressPercent: z.number().int().min(0).max(100),
  finishedAssetIds: z.array(id).max(10).optional(),
  issueNote: text(1000).optional(),
})

export const qcInspectionSchema = z.object({
  decision: z.enum(["PASSED", "REWORK_REQUESTED", "REJECTED"]),
  notes: text(2000).optional(),
  checklist: z.record(z.string().max(60), z.boolean()).optional(),
})

export const deliveryUpdateSchema = z.object({
  event: z.enum(["PICKED_UP", "ON_THE_WAY", "DELIVERED_SUCCESS", "DELIVERY_FAILED"]),
  carrier: text(100).optional(),
  shipperName: requiredText(200, "Thiếu tên shipper"),
  shipperPhone: text(20).optional(),
  podAssetId: id.optional(),
  recipientSignedName: text(200).optional(),
  failureReason: text(1000).optional(),
})

export const openExceptionSchema = z.object({
  type: z.enum(EXCEPTION_TYPES),
  severity: z.enum(EXCEPTION_SEVERITIES).default("MEDIUM"),
  description: requiredText(2000, "Thiếu mô tả sự cố"),
})

export const resolveExceptionSchema = z.object({
  resolution: requiredText(2000, "Thiếu cách xử lý"),
})

export const closeOrderSchema = z.object({
  partnerRating: z.number().int().min(1).max(5).optional(),
  partnerPayoutVnd: z.number().nonnegative().max(1_000_000_000).optional(),
  /** Bắt buộc khi tiền công khác số đã chốt (audit BL-22). */
  payoutReason: text(500).optional(),
  notes: text(2000).optional(),
})

export const cancelOrderSchema = z.object({
  reason: requiredText(1000, "Thiếu lý do huỷ"),
})

export const createPartnerSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,32}$/, "Mã đối tác 2–32 ký tự chữ/số/-/_"),
  name: requiredText(200, "Thiếu tên đối tác"),
  phone: z.string().trim().regex(/^\+?[0-9 .-]{8,15}$/, "Số điện thoại không hợp lệ"),
  address: text(500).optional(),
  district: text(100).optional(),
  province: text(100).optional(),
  tier: z.enum(["STANDARD", "PREFERRED", "VIP"]).default("STANDARD"),
  capacityDaily: z.number().int().min(1).max(1000).default(10),
  /** Giá trị trường tự tạo (entity PARTNER) — kiểm theo định nghĩa ở `applyCustomFields` (audit L-09). */
  customFields: z.record(z.string(), z.unknown()).optional(),
})

export const updatePartnerSchema = createPartnerSchema
  .omit({ code: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
