import { z } from "zod"

import { MAX_QUOTE_VND } from "@/modules/greeting-card/domain/brochure-payment-policy"
import { DELIVERY_FAILURE_REASONS, FAILURE_NOTE_MAX } from "@/modules/greeting-card/domain/delivery-failure"
import { FLOWER_NAME_MAX, FLOWER_REASON_MAX } from "@/modules/greeting-card/domain/flower-substitute"
import { SUBSTITUTE_MAX_OPTIONS, SUBSTITUTE_REASON_MAX } from "@/modules/greeting-card/domain/substitute-proposal"

/**
 * Lược đồ yêu cầu của đơn Thẻ chào `/api/v1/greeting-card/orders/*` (OpenAPI nội bộ, PO 07/11/2026). Lược đồ zod từng
 * khai trong route (và `_coordinator-handlers.ts`) được chuyển NGUYÊN VĂN về đây và route import lại.
 */

// orders/[id]/_coordinator-handlers.ts
export const floristBody = z.object({ floristNote: z.string().trim().min(1, "Nhập ghi chú phân công florist").max(500) })

// orders/[id]/_coordinator-handlers.ts
export const photoBody = z
  .object({
    assetId: z.string().min(1).max(64).optional(),
    assetIds: z.array(z.string().min(1).max(64)).min(1).max(7).optional(),
    skipPhoto: z.boolean().optional(),
    skipReason: z.string().trim().max(300).optional(),
  })
  .refine((v) => v.skipPhoto || v.assetId || v.assetIds, { message: "Thiếu ảnh hoặc chưa chọn bỏ qua" })

// orders/[id]/_coordinator-handlers.ts
export const shipBody = z.object({ trackingNote: z.string().trim().min(1, "Nhập thông tin vận chuyển").max(500) })

// orders/[id]/_coordinator-handlers.ts
export const deliveryFailedBody = z.object({
  reason: z.enum(DELIVERY_FAILURE_REASONS),
  note: z.string().trim().max(FAILURE_NOTE_MAX).optional(),
  chargeFee: z.boolean().optional(),
})

// orders/[id]/_coordinator-handlers.ts
// manualDispatch: chế độ tự động nhưng Điều phối muốn tự chọn cửa hàng cho riêng đơn này
export const acceptOrderBody = z.object({ note: z.string().trim().max(500).optional(), manualDispatch: z.boolean().optional() })

// orders/[id]/_coordinator-handlers.ts
export const rejectOrderBody = z.object({ reason: z.string().trim().min(1, "Nhập lý do từ chối nhận đơn").max(500) })

// orders/[id]/cancel/route.ts
export const gcCancelBody = z.object({
  reason: z.string().trim().min(3, "Nhập lý do huỷ (tối thiểu 3 ký tự)").max(500),
  /** Đơn đang giao: người huỷ đã đọc cảnh báo shipper đang trên đường (PO 15/10/2026) */
  confirmInTransit: z.boolean().optional(),
})

// orders/[id]/chain-dispatch/route.ts
export const chainDispatchBody = z.object({
  /**
   * Danh sách branchId đã được Điều hành DUYỆT để phát lệnh.
   * Bắt buộc từ 1–10 chi nhánh.
   */
  approvedBranchIds: z.array(z.string().min(1)).min(1).max(10),
  subcontractPriceVnd: z.number().int().min(0).optional(),
})

// orders/[id]/confirm-balance/route.ts
export const confirmBalanceBody = z.object({
  note: z.string().trim().max(500).nullable().optional(),
})

// orders/[id]/confirm-deposit/route.ts
export const confirmDepositBody = z.object({
  note: z.string().trim().max(500).nullable().optional(),
  /** Đang ở chế độ tự động nhưng muốn tự chọn cửa hàng cho riêng đơn này */
  manualDispatch: z.boolean().optional(),
})

// orders/[id]/confirm-order/route.ts
export const confirmOrderBody = z.object({
  note: z.string().trim().max(500).optional(),
})

// orders/[id]/confirm-order/route.ts
export const rejectNewOrderBody = z.object({
  reason: z.string().trim().min(1, "Nhập lý do từ chối đơn").max(500),
})

// orders/[id]/confirm-payment/route.ts
export const confirmPaymentBody = z.object({
  // Bỏ trống = đúng khoản khách được yêu cầu chuyển (cọc hoặc phần còn lại)
  amountVnd: z.number().int().positive().max(10_000_000_000).optional(),
  reference: z.string().max(100).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  /** Đang ở chế độ tự động nhưng muốn tự chọn cửa hàng cho riêng đơn này */
  manualDispatch: z.boolean().optional(),
})

// orders/[id]/discount-request/route.ts
export const discountRequestBody = z.object({
  percent: z.number().int().min(1).max(100).optional(),
  amountVnd: z.number().int().positive().max(1_000_000_000).optional(),
  reason: z.string().trim().min(3, "Ghi lý do xin giảm").max(500),
})

// orders/[id]/flower-substitute/route.ts
export const flowerSubstituteBody = z.object({
  reason: z.string().max(FLOWER_REASON_MAX),
  lineIndex: z.number().int().min(0).max(100),
  replacementName: z.string().max(FLOWER_NAME_MAX),
  replacementColor: z.string().max(40).optional(),
  photoAssetId: z.string().uuid(),
})

// orders/[id]/quote/route.ts
export const gcQuoteBody = z.object({
  totalVnd: z.number().int("Số tiền phải là số nguyên").positive("Nhập số tiền báo giá").max(MAX_QUOTE_VND),
  reason: z.string().trim().max(300).optional(),
})

// orders/[id]/refund/route.ts
export const refundBody = z.object({
  amountVnd: z.number().int().positive().max(10_000_000_000),
  reason: z.string().trim().min(3, "Nhập lý do hoàn tiền (tối thiểu 3 ký tự)").max(500),
})

// orders/[id]/reject-reported-payment/route.ts
export const rejectReportedPaymentBody = z.object({ reason: z.string().max(500).nullable().optional() })

// orders/[id]/substitute/route.ts
export const substituteBody = z.object({
  reason: z.string().max(SUBSTITUTE_REASON_MAX),
  productIds: z.array(z.string().max(64)).min(1).max(SUBSTITUTE_MAX_OPTIONS + 2),
})

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()

// orders/[id]/vat/route.ts
export const gcVatBody = z.object({
  enabled: z.boolean(),
  rate: z.union([z.literal(8), z.literal(10)]).default(10),
  companyName: optionalText(200),
  taxCode: z.string().trim().regex(/^(\d{10}|\d{10}-\d{3}|\d{12})?$/, "Mã số thuế gồm 10 hoặc 13 số (dạng 0123456789-001)").nullable().optional(),
  companyAddress: optionalText(300),
  email: z.union([z.literal(""), z.string().trim().email("Email nhận hoá đơn không hợp lệ").max(200)]).nullable().optional(),
})

