import { z } from "zod"

/**
 * Phản hồi Thẻ Gia Công công khai `/public/subcontract/{orderCode}/*` (audit API đợt 6). Phản hồi dựng ngay
 * trong route từ `metadata` điều phối — suy từ phản hồi thật (`tests/tenant/public-contract-subcontract.test.ts`)
 * và mã route/use-case.
 */
const timestamp = z.iso.datetime()
const step = z.enum(["QC", "SHIPPER", "POD"])
const aiVerdict = z.strictObject({ isMatch: z.boolean(), confidenceScore: z.number(), verdict: z.enum(["MATCH", "MISMATCH", "UNCERTAIN"]), reason: z.string() })
const shipperInfo = z.strictObject({
  shipperName: z.string(),
  shipperPhone: z.string(),
  shipperNote: z.string().nullable(),
  submittedByBranchId: z.string(),
  submittedAt: timestamp,
})
const bypassRequest = z.strictObject({
  reason: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  requestedAt: timestamp,
  requestedByBranchId: z.string(),
  requestedByBranchName: z.string(),
  decidedBy: z.string().nullable(),
  decisionAt: timestamp.nullable(),
  /** Ghi chú của Điều phối khi duyệt/từ chối. */
  reviewNote: z.string().optional(),
})

/** `GET` — SĐT người nhận che khi chi nhánh chưa nhận đơn; shipper/xin bỏ qua chỉ hiện cho chi nhánh đang làm. */
export const subcontractViewResponse = z.strictObject({
  data: z.strictObject({
    orderId: z.string(),
    orderCode: z.string(),
    branchId: z.string(),
    branchName: z.string(),
    product: z.strictObject({
      name: z.string(),
      imageUrl: z.string().nullable(),
      bomItems: z.array(z.strictObject({ name: z.string(), quantity: z.number(), unit: z.string() })),
    }),
    deliveryAddress: z.string(),
    deliveryTime: z.string(),
    deliveryTimestampMs: z.number().nullable(),
    stepDeadlines: z.strictObject({
      deliveryTimestampMs: z.number().nullable(),
      step1GraceExpiresAt: z.string().nullable(),
      step2QcDeadlineMs: z.number().nullable(),
      step3ShipperDeadlineMs: z.number().nullable(),
      step4DeliveryDeadlineMs: z.number().nullable(),
    }),
    recipientName: z.string(),
    recipientPhone: z.string(),
    isPhoneMasked: z.boolean(),
    cardMessage: z.string().nullable(),
    specialNotes: z.string().nullable(),
    subcontractPriceVnd: z.number(),
    craftFeeDeductions: z.array(z.strictObject({ amountVnd: z.number(), reason: z.string() })),
    craftFeePayableVnd: z.number(),
    dispatchStatus: z.string(),
    claimedByBranchId: z.string().nullable(),
    claimedBranchName: z.string().nullable(),
    graceExpiresAt: z.string().nullable(),
    productionStatus: z.string(),
    deliveryStatus: z.string(),
    orderStatus: z.string(),
    qcPhotos: z.array(z.string()),
    lastAiVerification: aiVerdict.nullable(),
    autoBypassedCoordinator: z.boolean(),
    bypassRequests: z.partialRecord(step, bypassRequest).nullable(),
    shipperInfo: shipperInfo.nullable(),
    deliveryProof: z
      .strictObject({ photoUrls: z.array(z.string()), note: z.string().nullable(), deliveredAt: z.string().nullable(), deliveredByBranch: z.string().nullable() })
      .nullable(),
  }),
})

/** `POST` theo `action`: CLAIM (nhận, có hạn huỷ), CANCEL (huỷ trong hạn, trừ điểm), COMMIT (xác nhận làm), DELETE_QC. */
export const subcontractActionResponse = z.strictObject({
  data: z.union([
    z.strictObject({ success: z.boolean(), orderId: z.string(), claimedBranchId: z.string(), graceMinutes: z.number(), graceExpiresAt: z.string() }),
    z.strictObject({
      success: z.boolean(),
      reopened: z.boolean(),
      penalty: z.strictObject({ penalized: z.literal(true), scoreDeducted: z.number(), currentQualityScore: z.number(), totalCancellations: z.number() }),
    }),
    z.strictObject({ success: z.literal(true), dispatchStatus: z.literal("COMMITTED"), alreadyCommitted: z.literal(true).optional() }),
    z.strictObject({ success: z.literal(true), remainingCount: z.number() }),
  ]),
})

export const subcontractBypassResponse = z.strictObject({
  data: z.strictObject({ success: z.literal(true), message: z.string(), step, status: z.literal("PENDING"), requestedAt: timestamp, coordinatorNotified: z.boolean() }),
})

export const subcontractQcResponse = z.strictObject({
  data: z.strictObject({
    success: z.literal(true),
    message: z.string(),
    photoUrl: z.string(),
    allQcPhotos: z.array(z.string()),
    productionStatus: z.string(),
    aiVerification: aiVerdict,
    autoBypassedCoordinator: z.boolean(),
  }),
})

/** Gửi lại khi đã có shipper → trả bản đã lưu với `alreadySubmitted: true` (idempotent). */
export const subcontractShipperResponse = z.strictObject({
  data: z.union([
    z.strictObject({ success: z.literal(true), message: z.string(), shipperInfo, deliveryStatus: z.string() }),
    z.strictObject({ success: z.literal(true), alreadySubmitted: z.literal(true), message: z.string(), shipperInfo }),
  ]),
})

export const subcontractDeliveryResponse = z.strictObject({
  data: z.strictObject({ orderCode: z.string(), deliveryStatus: z.string(), orderStatus: z.string(), deliveredAt: timestamp, photoUrl: z.string(), note: z.string() }),
})
