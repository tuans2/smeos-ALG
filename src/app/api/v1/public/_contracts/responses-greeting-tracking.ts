import { z } from "zod"

import {
  changeEntry,
  flowerSubstituteProposal,
  paymentPlanSource,
  productSnapshot,
  shippingSettings,
  submittedOrder,
  substituteProposal,
  vietQrInstructions,
} from "./responses-greeting-shared"

/**
 * Phản hồi theo dõi đơn `/public/brochure/tracking/{code}/*` và catalog Thẻ chào `/public/greeting-catalog/{id}/*`
 * (audit API đợt 6). `GET`/`POST` theo dõi: không có đơn → 404, nên chỉ có nhánh `FOUND`.
 */
const step = z.strictObject({ stepKey: z.enum(["ARRANGING", "DELIVERING", "QC"]), label: z.string(), startIso: z.string(), endIso: z.string(), displayRange: z.string() })
const changeRequest = z.strictObject({
  id: z.string(),
  status: z.enum(["PENDING", "REJECTED", "APPROVED"]),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
  changes: z.array(changeEntry),
  feeDeltaVnd: z.number(),
})

/**
 * Ảnh chụp mẫu trên trang theo dõi là `metadata` của dòng đơn (JSON tự do): snapshot lúc chọn + `variant`
 * lúc đặt + `flowers` (công thức hoa tiệm nhập). Khai `looseObject` — khoá đã biết có kiểu, khoá khác vẫn có
 * thể xuất hiện; riêng trường này không strict.
 */
const orderItemSnapshot = z.looseObject({
  ...productSnapshot.shape,
  variant: z.strictObject({ id: z.string(), name: z.string(), stemCount: z.number().nullable().optional() }).nullable().optional(),
  flowers: z.array(z.record(z.string(), z.unknown())).optional(),
})

const trackedOrder = z.strictObject({
  code: z.string(),
  status: z.enum(["DRAFT", "CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED", "CANCELLED"]),
  productionStatus: z.enum(["WAITING", "ASSIGNED", "ARRANGING", "QUALITY_CHECK", "READY"]),
  deliveryStatus: z.enum(["DELIVERED", "PENDING", "DISPATCHED", "DELIVERING", "FAILED"]),
  totalVnd: z.number(),
  paidVnd: z.number(),
  balanceVnd: z.number(),
  /** `true` khi người xem là chủ link hoặc đã xác minh 4 số cuối SĐT — mới thấy ảnh người nhận, thông tin đổi. */
  verified: z.boolean(),
  cardMessage: z.string().nullable(),
  recipientName: z.string(),
  deliveryAddress: z.string(),
  deliveryDate: z.string().nullable(),
  deliveryTimeSlot: z.string().nullable(),
  checkOutDate: z.string().nullable(),
  customerReportedPayment: z.boolean(),
  productSnapshot: orderItemSnapshot.nullable(),
  finishedImageUrl: z.string().nullable(),
  productPhotoUrls: z.array(z.string()),
  recipientPhotoUrls: z.array(z.string()),
  photoApproval: z.strictObject({
    status: z.enum(["PENDING", "APPROVED", "NONE", "AUTO_APPROVED"]),
    uploadedAt: z.string().nullable(),
    countdownMinutes: z.number(),
    approvedAt: z.string().nullable(),
  }),
  /** Ngành của tiệm (vd. `FLORAL`, `HOMESTAY`) — lấy từ cài đặt tổ chức. */
  industryKey: z.unknown(),
  createdAt: z.string(),
  updatedAt: z.string(),
  timeline: z.strictObject({ arranging: step.optional(), readyQc: step.optional(), delivering: step.optional() }).nullable(),
  bypassNotices: z.strictObject({ qc: z.string().nullable(), shipper: z.string().nullable(), pod: z.string().nullable() }),
  payment: z.strictObject({
    requirePaymentProof: z.boolean(),
    balanceInstructions: vietQrInstructions.nullable(),
    policy: z.string(),
    policyLabel: z.string(),
    source: paymentPlanSource,
    paymentCode: z.string().nullable(),
    campaignName: z.string().nullable(),
    depositPercent: z.number(),
    totalVnd: z.number(),
    paidVnd: z.number(),
    remainingVnd: z.number(),
    status: z.enum(["UNPAID", "PAYMENT_PENDING", "PARTIALLY_PAID", "PAID", "PAYMENT_FAILED"]),
    statusLabel: z.string(),
    milestones: z.array(
      z.strictObject({
        seq: z.number(),
        kind: z.enum(["FULL", "DEPOSIT", "BALANCE"]),
        due: z.enum(["ON_ORDER", "AFTER_PRODUCT_PHOTO", "AFTER_DELIVERY"]),
        percent: z.number(),
        amountVnd: z.number(),
        paidVnd: z.number(),
        status: z.enum(["PENDING", "PARTIALLY_PAID", "PAID"]),
      })
    ),
    balanceDue: z.boolean(),
  }),
  deliveryFailure: z.strictObject({ at: z.string(), reasonLabel: z.string(), note: z.string().nullable(), feeVnd: z.number(), attempts: z.number() }).nullable(),
  change: z
    .strictObject({
      lockedReason: z.string().nullable(),
      cardLocked: z.boolean(),
      pending: changeRequest.nullable(),
      history: z.array(changeRequest),
      current: z.strictObject({
        recipientPhone: z.string(),
        deliveryDate: z.string(),
        deliveryTimeSlot: z.string(),
        recipientName: z.string(),
        deliveryAddress: z.string(),
        addressParts: z
          .strictObject({ houseNumber: z.string(), street: z.string(), ward: z.string(), district: z.string().optional(), province: z.string() })
          .nullable(),
        shippingZoneId: z.string().nullable(),
        shippingZoneName: z.string().nullable(),
        cardMessage: z.string(),
        deliveryNote: z.string(),
        mapUrl: z.string(),
      }),
      shipping: shippingSettings,
    })
    .nullable(),
  substitute: z.strictObject({ pending: substituteProposal.nullable(), history: z.array(substituteProposal) }).nullable(),
  flowerSubstitute: z.strictObject({ pending: flowerSubstituteProposal.nullable(), history: z.array(flowerSubstituteProposal) }).nullable(),
  cancellationNotice: z.strictObject({ refundToConfirm: z.boolean(), cancelledAt: z.string(), contactDeadline: z.string(), refundVnd: z.number() }).nullable(),
  thankYouVoucher: z.strictObject({ code: z.string(), percent: z.number(), expiresAt: z.string().nullable(), used: z.boolean() }).nullable(),
})

export const trackingResponse = z.strictObject({
  status: z.literal("FOUND"),
  order: trackedOrder,
  trackingStep: z.strictObject({ stepIndex: z.number(), title: z.string(), description: z.string(), percentage: z.number() }),
})

export const approvePhotoResponse = z.strictObject({ success: z.literal(true), message: z.string() })

export const changeRequestResponse = z.strictObject({
  data: z.strictObject({ id: z.string(), status: z.literal("PENDING"), changes: z.array(changeEntry), expectedFeeDeltaVnd: z.number() }),
})

export const substituteAnswerResponse = z.strictObject({ data: substituteProposal })
export const flowerSubstituteAnswerResponse = z.strictObject({ data: flowerSubstituteProposal })

export const catalogEventResponse = z.strictObject({ ok: z.literal(true) })
/** Đơn đặt từ catalog Thẻ chào — kèm cookie chủ phiên của link mới (`set-cookie`). */
export const greetingCatalogOrderResponse = submittedOrder
