import { z } from "zod"

/**
 * Lược đồ yêu cầu của Điều phối `/api/v1/coordinator/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ khai trong module
 * (`coordinator/adapters/http-schemas.ts`) được dùng thẳng; lược đồ từng khai trong route được chuyển NGUYÊN VĂN về
 * đây và route import lại. Thân do use-case tự kiểm có lược đồ MÔ TẢ ở cuối tệp.
 */
export {
  assignPartnerSchema,
  cancelOrderSchema,
  closeOrderSchema,
  createOrderSchema,
  createPartnerSchema,
  deliveryUpdateSchema,
  listQuerySchema,
  openExceptionSchema,
  productionUpdateSchema,
  qcInspectionSchema,
  recordPaymentSchema,
  resolveExceptionSchema,
  updateCustomFieldsSchema,
  updatePartnerSchema,
  updateStageSchema,
} from "@/modules/coordinator/adapters/http-schemas"

// orders/[id]/approve-bypass/route.ts
export const bypassDecisionBody = z.object({
  step: z.enum(["QC", "SHIPPER", "POD"]),
  decision: z.enum(["APPROVE", "REJECT"]),
  review_note: z.string().trim().max(300).optional(),
})

// orders/[id]/confirm-delivery/route.ts
export const confirmDeliveryBody = z.object({
  confirm_without_photo: z.literal(true),
  reason: z.string().trim().min(5, "Lý do tối thiểu 5 ký tự").max(300),
})

// orders/[id]/craft-fee-complaint/route.ts
export const craftFeeComplaintBody = z.object({ reason: z.string().trim().min(5).max(500) })

// orders/[id]/dispatch-to-chat/route.ts
export const dispatchToChatBody = z.object({
  target_partner_org_id: z.string().uuid(),
  target_partner_user_id: z.string().uuid().optional(),
})

const VIETNAM_PHONE_RE = /^(0|\+84)(3[2-9]|5[6-9]|7[0689]|8[1-9]|9[0-9])\d{7}$/

// orders/[id]/set-shipper/route.ts
export const setShipperBody = z.object({
  shipper_name: z.string().trim().min(2, "Tên shipper tối thiểu 2 ký tự").max(80),
  shipper_phone: z
    .string()
    .trim()
    .regex(VIETNAM_PHONE_RE, "Số điện thoại không hợp lệ (vd: 0912345678)"),
  shipper_note: z.string().trim().max(200).optional(),
})

// partners/[id]/status/route.ts
export const partnershipStatusBody = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]),
  // Lý do kiểm ở use-case SAU bước kiểm sở hữu — chuỗi khác luôn nhận 404, không 400
  reason: z.string().max(500).optional(),
})

// partners/[id]/tools/route.ts
export const partnerToolsBody = z.object({
  // Mã công cụ là navKey dạng chữ thường-gạch-ngang; giới hạn độ dài để không ghi rác vào settings
  unlocked_tools: z.array(z.string().regex(/^[a-z0-9-]{1,64}$/)).max(200),
})

// partners/link-existing/route.ts
export const linkExistingBody = z.object({
  identifier: z.string().min(2, "Vui lòng nhập Email đại diện hoặc Mã/Slug của cửa hàng"),
  partner_code: z.string().min(2, "Mã đối tác phải từ 2 ký tự"),
  partnership_type: z.enum(["SUBCONTRACTOR", "FRANCHISE"]).optional(), // BRANCH bỏ — ADR-012 D-T2
  commission_rate: z.number().optional(),
  capacity_daily: z.number().optional(),
})

// partners/route.ts
export const provisionPartnerBody = z.object({
  partner_store_name: z.string().min(2, "Tên cửa hàng phải từ 2 ký tự"),
  partner_code: z.string().min(2, "Mã đối tác phải từ 2 ký tự"),
  partnership_type: z.enum(["SUBCONTRACTOR", "FRANCHISE"]).optional(), // BRANCH bỏ — ADR-012 D-T2
  contact_name: z.string().min(2, "Tên người đại diện không được để trống"),
  contact_phone: z.string().min(8, "Số điện thoại không hợp lệ"),
  contact_email: z.string().email("Email không hợp lệ"),
  password: z.string().min(10, "Mật khẩu tối thiểu 10 ký tự").optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  capacity_daily: z.number().optional(),
  commission_rate: z.number().optional(),
})

// reminders/acknowledge/route.ts
export const acknowledgeReminderBody = z.object({
  order_id: z.string().min(1, "orderId không được để trống"),
  milestone: z.enum(["M0", "M1", "M2", "M3", "M4", "M5"]),
  action: z.enum(["ACKNOWLEDGED", "SNOOZED", "DISMISSED"]),
  snooze_minutes: z.number().int().min(1).max(120).optional(),
  note: z.string().max(500).optional(),
})

// settings/reminders/route.ts
export const reminderPolicyBody = z.object({
  m0MinutesAfterPaid: z.number().int().min(0).max(1440).optional(),
  m1MinutesBeforeDelivery: z.number().int().min(0).max(1440).optional(),
  m2MinutesBeforeDelivery: z.number().int().min(0).max(1440).optional(),
  m3MinutesAfterShipperAssigned: z.number().int().min(0).max(1440).optional(),
  m5MinutesAfterDelivery: z.number().int().min(0).max(1440).optional(),
})

// templates/[id]/reminders/route.ts
export const templateRemindersBody = z.object({
  m0MinutesAfterPaid: z.number().int().min(0).max(1440).nullable().optional(),
  m1MinutesBeforeDelivery: z.number().int().min(0).max(1440).nullable().optional(),
  m2MinutesBeforeDelivery: z.number().int().min(0).max(1440).nullable().optional(),
  m3MinutesAfterShipperAssigned: z.number().int().min(0).max(1440).nullable().optional(),
  m5MinutesAfterDelivery: z.number().int().min(0).max(1440).nullable().optional(),
})


// ── Lược đồ mô tả: thân do use-case/route tự kiểm ────────────────────────────────────────────────────────
/** `decidePendingPayment` — từ chối phải ghi lý do ≥ 3 ký tự; ghi chú cắt 500 ký tự. */
export const paymentDecisionBody = z.object({ approve: z.boolean(), note: z.string().optional() })
/** Ảnh thành phẩm / ảnh giao hàng: JPG/PNG/WebP ≤ 10 MB (máy chủ đọc byte đầu, không tin `type`). */
export const photoUploadForm = z.object({ file: z.file(), note: z.string().optional() })
export const partnersQuery = z.object({
  /** `1` = chỉ đối tác gia công đang hoạt động. */
  active: z.enum(["0", "1"]).optional(),
})
export const chainPartnersQuery = z.object({
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
  province: z.string().optional(),
  q: z.string().optional(),
})
