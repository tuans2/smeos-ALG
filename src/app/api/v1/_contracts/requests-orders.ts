import { z } from "zod"

import { FLORIST_ACTIONS } from "@/modules/orders/domain/florist-work"
import { ORDER_SOURCE_CODES } from "@/modules/orders/domain/order-source"

/**
 * Lược đồ yêu cầu của đơn hàng `/api/v1/orders/*` và báo giá `/api/v1/quotations/*` (OpenAPI nội bộ, PO 07/11/2026).
 * Lược đồ zod từng khai trong route được chuyển NGUYÊN VĂN về đây và route import lại. Thân do use-case tự kiểm
 * (thanh toán, báo giá đơn, giao trước thu sau, cài đặt) khai lược đồ MÔ TẢ — `internal-request-parity.test.ts`
 * đối chiếu hằng số, test hợp đồng trên CSDL thật gửi đúng các thân này.
 */

// orders/route.ts
export const createOrderBody = z.object({
  branchId: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      variantId: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().int().positive().max(999).default(1),
      unitPriceVnd: z.number().int().nonnegative(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1, "Đơn hàng phải có ít nhất 1 sản phẩm"),
  pricingRuleRef: z.record(z.string(), z.unknown()).optional(),
  cardMessage: z.string().optional(),
  internalNote: z.string().optional(),
  deliveryWindow: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày giao dạng YYYY-MM-DD"),
      timeSlot: z.string().optional(),
    })
    .optional(),
  deliveryAddress: z
    .object({
      recipientName: z.string(),
      phone: z.string(),
      street: z.string(),
      ward: z.string().optional(),
      district: z.string().optional(),
      province: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

// orders/[id]/route.ts
export const patchOrderBody = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
  productionStatus: z.enum(["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"]).optional(),
  deliveryStatus: z.enum(["PENDING", "DISPATCHED", "DELIVERING", "DELIVERED", "FAILED"]).optional(),
  cardMessage: z.string().optional(),
  internalNote: z.string().optional(),
  deliveryWindow: z
    .object({
      date: z.string(),
      timeSlot: z.string().optional(),
    })
    .optional(),
  deliveryAddress: z
    .object({
      recipientName: z.string(),
      phone: z.string(),
      street: z.string(),
      ward: z.string().optional(),
      district: z.string().optional(),
      province: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
})

// orders/[id]/assign/route.ts
export const assignOrderBody = z.object({
  assigneeId: z.string().min(1, "Bắt buộc phải chọn nhân sự thực hiện"),
  difficulty: z.enum(["co_ban", "trung_binh", "kho", "vip"]).optional(),
})

// orders/[id]/cancel/route.ts
export const cancelOrderBody = z.object({
  reason: z.string().min(3, "Lý do hủy đơn phải có ít nhất 3 ký tự"),
})

// orders/[id]/info-requests/route.ts
export const createInfoRequestBody = z.object({
  field: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(500),
  requestedFrom: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().nullish(),
  channel: z.string().trim().max(40).nullish(),
})

// orders/[id]/info-requests/[requestId]/route.ts
export const closeInfoRequestBody = z.object({ outcome: z.enum(["RECEIVED", "CANCELLED"]), note: z.string().max(500).optional() })

// orders/[id]/my-work/route.ts
export const floristWorkBody = z.object({ action: z.enum(FLORIST_ACTIONS as ["START", "FINISH"]) })

// orders/[id]/vat/route.ts
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()
export const orderVatBody = z.object({
  enabled: z.boolean(),
  rate: z.union([z.literal(8), z.literal(10)]).default(10),
  company_name: optionalText(200),
  tax_code: z.string().trim().regex(/^(\d{10}|\d{10}-\d{3}|\d{12})?$/, "Mã số thuế gồm 10 hoặc 13 số (dạng 0123456789-001)").nullable().optional(),
  company_address: optionalText(300),
  email: z.union([z.literal(""), z.string().trim().email("Email nhận hoá đơn không hợp lệ").max(200)]).nullable().optional(),
})

// ── Lược đồ mô tả: thân do use-case tự kiểm ──────────────────────────────────────────────────────────────
/** `confirmOrderPayment` — cùng danh sách `PAYMENT_METHODS`; ghi chú/mã tham chiếu cắt 200 ký tự. */
export const PAYMENT_METHODS_DOC = ["BANK_TRANSFER", "CASH", "CARD", "E_WALLET", "COD"] as const
export const orderPaymentBody = z.object({
  amountVnd: z.number().int().positive(),
  method: z.enum(PAYMENT_METHODS_DOC),
  reference: z.string().optional(),
  note: z.string().optional(),
})
/** `quoteOrder` — giá 1…`MAX_QUOTE_VND` đồng; ghi chú cắt 500 ký tự. */
export const MAX_QUOTE_VND_DOC = 1_000_000_000
export const quoteOrderBody = z.object({ totalVnd: z.number().int().positive().max(MAX_QUOTE_VND_DOC), note: z.string().optional() })
/** `requestDeliverBeforePay` — lý do bắt buộc, tối đa 500 ký tự. */
export const deliverBeforePayBody = z.object({ reason: z.string().trim().min(1).max(500) })
/** `decideDeliverBeforePay` — từ chối bắt buộc ghi lý do; `collectDueAt` (ISO) đặt hạn thu khi duyệt. */
export const deliverBeforePayDecisionBody = z.object({ approve: z.boolean(), note: z.string().optional(), collectDueAt: z.string().optional() })
/** `validateDeliverBeforePaySettings` — mọi trường tuỳ chọn; trường gửi lên phải đúng khoảng (số lẻ được làm tròn). */
export const deliverBeforePaySettingsBody = z.object({
  allowSelfDecide: z.boolean().optional(),
  selfDecideMaxVnd: z.number().min(0).max(1_000_000_000).optional(),
  minCompletedOrders: z.number().min(0).max(1000).optional(),
  collectDueDays: z.number().min(1).max(90).optional(),
  /** `null` = không giới hạn công nợ. */
  customerDebtCapVnd: z.number().min(0).max(1_000_000_000).nullable().optional(),
})
/** `parseEntryActionsSettings` — khoá/giá trị lạ bị bỏ; mỗi nguồn phải còn ít nhất một nút bật. */
const entryFlags = z.object({ order: z.boolean().optional(), contact: z.boolean().optional() })
export const entryActionsBody = z.object({
  default: entryFlags.optional(),
  bySource: z.partialRecord(z.enum(ORDER_SOURCE_CODES), entryFlags).optional(),
})

// ── Query ────────────────────────────────────────────────────────────────────────────────────────────────
const limit100 = z.string().regex(/^\d+$/).optional()
export const listOrdersQuery = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
  production_status: z.enum(["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"]).optional(),
  delivery_status: z.enum(["PENDING", "DISPATCHED", "DELIVERING", "DELIVERED", "FAILED"]).optional(),
  branch_id: z.string().optional(),
  customer_id: z.string().optional(),
  search: z.string().optional(),
  delivery_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  delivery_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sale_id: z.string().max(64).optional(),
  /** 1–100, mặc định 50. */
  limit: limit100,
  /** `next_cursor` của trang trước (mờ). */
  cursor: z.string().optional(),
})
export const approvalRequestsQuery = z.object({ status: z.string().optional(), limit: limit100 })
export const exportOrdersQuery = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  source: z.enum(ORDER_SOURCE_CODES).optional(),
})
export const floristQueueQuery = z.object({ scope: z.enum(["mine", "team"]).optional() })

// ── Báo giá (quotations/route.ts và quotations/[id]/route.ts) ───────────────────────────────────────────
const quotationItemSchema = z.object({
  product_id: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  name: z.string().min(1, "Tên sản phẩm không được để trống").max(200),
  variant_label: z.string().max(80).nullable().optional(),
  variantLabel: z.string().max(80).nullable().optional(),
  qty: z.number().int().min(1, "Số lượng phải từ 1 trở lên"),
  unit_price: z.number().min(0, "Đơn giá không thể âm").optional(),
  unitPrice: z.number().min(0, "Đơn giá không thể âm").optional(),
  note: z.string().nullable().optional(),
})
export const createQuotationBody = z.object({
  lead_id: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  asset_usage_id: z.string().nullable().optional(),
  assetUsageId: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  discount_amount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  shipping_fee: z.number().min(0).max(100_000_000).optional(),
  shippingFee: z.number().min(0).max(100_000_000).optional(),
  terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(quotationItemSchema).min(1, "Báo giá phải có ít nhất một sản phẩm"),
})
export const updateQuotationBody = z.object({
  status: z
    .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"])
    .optional(),
  valid_until: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  discount_amount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  shipping_fee: z.number().min(0).max(100_000_000).optional(),
  shippingFee: z.number().min(0).max(100_000_000).optional(),
  terms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(quotationItemSchema).optional(),
})
export const listQuotationsQuery = z.object({
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED"]).optional(),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  /** 1–100, mặc định 20. */
  limit: limit100,
})

// orders/[id]/delivery-window/route.ts — R21, PO 11/11/2026
export const deliveryWindowChangeBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày giao dạng YYYY-MM-DD"),
  time_slot: z.string().trim().max(40).optional(),
  reason: z.string().trim().min(3, "Cần ghi lý do đổi giờ giao").max(300),
})
