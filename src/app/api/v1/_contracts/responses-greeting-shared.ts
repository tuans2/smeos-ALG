import { z } from "zod"

import { timestamp } from "./responses-orders"

/**
 * Mảnh phản hồi dùng chung của Thẻ chào `/api/v1/greeting-card/*` (OpenAPI nội bộ, PO 07/11/2026): bước của hành
 * trình, kết quả đọc ảnh chuyển khoản, đề xuất bỏ theo dõi, một mục theo dõi (đơn hoặc link), dòng đơn Thẻ chào.
 * Sinh từ kiểu TS của use-case rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-greeting-*.test.ts`.
 */
export const STEP_ID = z.enum([
  "STEP_1_OPENED", "STEP_2_CHOOSING", "STEP_3_FILLING_FORM", "STEP_4_PAYMENT_PENDING", "STEP_5_PAYMENT_CONFIRMED",
  "STEP_6_ARRANGING", "STEP_7_READY_QC", "STEP_8_DELIVERING", "STEP_9_COMPLETED",
])
export const ROLE = z.enum(["SALE", "ADMIN", "COORDINATOR"])
export const DECISION_STATUS = z.enum(["APPROVED", "PENDING", "REJECTED"])
export const ORDER_STATUS = z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED"])

export const proofAnalysis = z.strictObject({
  status: z.enum(["PENDING", "MATCHED", "AMOUNT_MISMATCH", "ACCOUNT_MISMATCH", "SUSPICIOUS", "UNREADABLE"]),
  extracted: z.strictObject({
    bankName: z.string().optional(),
    receiverAccountNumber: z.string().optional(),
    receiverName: z.string().optional(),
    amountVnd: z.number(),
    transactionTime: z.string().optional(),
    transactionCode: z.string().optional(),
    isSuccessStatus: z.boolean(),
    rawStatusText: z.string().optional(),
    notes: z.string().optional(),
  }),
  expectedAmountVnd: z.number(),
  amountDifferenceVnd: z.number(),
  confidenceScore: z.number(),
  reasons: z.array(z.string()),
  analyzedAt: z.string(),
})
export const dismissal = z.strictObject({
  status: DECISION_STATUS,
  reason: z.string(),
  category: z.string().optional(),
  note: z.string().optional(),
  proposedBy: z.string(),
  proposedByName: z.string().optional(),
  proposedAt: z.string(),
  decidedBy: z.string().optional(),
  decidedByName: z.string().optional(),
  decidedAt: z.string().optional(),
  autoDismissed: z.boolean().optional(),
})
const opt = z.string().nullable().optional()

/** Một mục theo dõi — đơn (`ORDER`) hoặc link chưa đặt (`SESSION`) — kèm bước hiện tại và các bước của hành trình. */
export const trackingItemBase = z.strictObject({
  id: z.string(),
  type: z.enum(["ORDER", "SESSION"]),
  orderId: opt,
  sessionId: z.string(),
  orderCode: opt,
  sendCode: z.string(),
  catalogName: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  recipientName: opt,
  recipientPhone: opt,
  deliveryAddress: opt,
  deliveryDate: opt,
  deliveryTimeSlot: opt,
  deliveryZone: opt,
  deliveryFailed: z.boolean().optional(),
  saleName: z.string(),
  cardMessage: opt,
  productName: z.string(),
  productPrice: z.number(),
  productImageUrl: opt,
  totalVnd: z.number(),
  paidVnd: z.number(),
  balanceVnd: z.number(),
  currentStepId: STEP_ID,
  currentStepTitle: z.string(),
  orderStatus: opt,
  sessionStatus: opt,
  customerReportedPaid: z.boolean().optional(),
  paymentProofUrl: opt,
  paymentProofAnalysis: proofAnalysis.nullable().optional(),
  paymentProofBalanceUrl: opt,
  paymentProofBalanceAnalysis: proofAnalysis.nullable().optional(),
  productionStatus: opt,
  deliveryStatus: opt,
  stepStartedAt: z.string(),
  stuck: z.strictObject({ stepId: STEP_ID, owner: ROLE, overdueMinutes: z.number(), message: z.string() }).nullable(),
  saleId: z.string().nullable(),
  coordinatorId: opt,
  coordinatorName: opt,
  channel: z.string(),
  linkKind: z.enum(["PERSONAL", "SHARED", "LEGACY"]),
  copiedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isCancelled: z.boolean().optional(),
  cancelReason: opt,
  dismissal: dismissal.optional(),
  steps: z.array(
    z.strictObject({
      id: STEP_ID,
      title: z.string(),
      shortTitle: z.string(),
      roleResponsible: z.string(),
      orderIndex: z.number(),
      status: z.enum(["completed", "current", "pending"]),
      completedAt: opt,
    })
  ),
  lastActiveAt: z.string(),
  openedAt: opt,
  createdAt: z.string(),
})
/** Mục theo dõi kèm hạn xử lý của bước hiện tại. */
export const trackingItem = trackingItemBase.extend({
  sla: z.strictObject({
    state: z.enum(["NONE", "ON_TRACK", "DUE_SOON", "OVERDUE"]),
    minutes: z.number().nullable(),
    dueAt: z.string().nullable(),
    ageMinutes: z.number(),
    owner: ROLE.nullable(),
  }),
})

/** Sản phẩm của đơn (ảnh, giá, tóm tắt hoa) — `withOrderProduct`. */
export const orderProduct = z.strictObject({
  productId: z.string().nullable(),
  name: z.string(),
  code: z.string().nullable(),
  imageUrl: z.string().nullable(),
  price: z.number(),
  flowersSummary: z.string().nullable(),
  variantName: z.string().nullable(),
  stemCount: z.number().nullable(),
})
export const orderItemRow = z.strictObject({
  unit_price_vnd: z.number(),
  id: z.string(),
  organization_id: z.string(),
  description: z.string().nullable(),
  created_at: timestamp,
  updated_at: timestamp,
  product_id: z.string().nullable(),
  order_id: z.string(),
  metadata: z.unknown(),
  variant_id: z.string().nullable(),
  quantity: z.number(),
})
/** Cột của bảng `orders` (đơn Thẻ chào trả nguyên dòng, khoá snake_case). */
export const orderColumns = {
  id: z.string(),
  organization_id: z.string(),
  code: z.string(),
  created_by: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
  branch_id: z.string().nullable(),
  status: ORDER_STATUS,
  customer_id: z.string().nullable(),
  production_status: z.enum(["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"]),
  delivery_status: z.enum(["PENDING", "DELIVERED", "DISPATCHED", "DELIVERING", "FAILED"]),
  pricing_rule_ref: z.unknown(),
  voucher_id: z.string().nullable(),
  card_message: z.string().nullable(),
  internal_note: z.string().nullable(),
  delivery_window: z.unknown(),
  delivery_address: z.unknown(),
  vat_enabled: z.boolean(),
  vat_rate: z.number(),
  /** Decimal của Prisma, tuần tự hoá thành chuỗi. */
  vat_amount_vnd: z.string(),
  source: z.string().nullable(),
  source_session_id: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  /** Băm thân `POST /orders` đi kèm khoá (audit API-11, 11/11/2026); NULL ở đơn không có khoá. */
  idempotency_body_hash: z.string().nullable(),
  owner_sale_id: z.string().nullable(),
  lead_id: z.string().nullable(),
  workflow: z.string(),
  total_vnd: z.number(),
  paid_vnd: z.number(),
  balance_vnd: z.number(),
}
export const customerRef = z.strictObject({ id: z.string(), code: z.string(), name: z.string(), phone: z.string() })
