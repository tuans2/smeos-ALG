import { z } from "zod"

import { data, timestamp } from "./responses-orders"
import { customerRef, orderColumns, orderItemRow, orderProduct } from "./responses-greeting-shared"

/**
 * Phản hồi đơn Thẻ chào `/api/v1/greeting-card/orders/*` (OpenAPI nội bộ, PO 07/11/2026). Sinh từ kiểu TS của use-case
 * (`src/modules/greeting-card`) rồi kiểm bằng phản hồi thật ở `tests/tenant/internal-contract-greeting-orders.test.ts`.
 */
const ref = { orderId: z.string(), orderCode: z.string() }
export const orderRefResponse = data(z.strictObject(ref))

/** Dòng danh sách đơn: cột `orders` + dòng hàng, thanh toán, phiên Thẻ chào, khách, QC, ảnh chuyển khoản, sản phẩm. */
export const gcOrderRow = z.strictObject({
  ...orderColumns,
  items: z.array(orderItemRow),
  payments: z.array(
    z.strictObject({
      amount_vnd: z.number(),
      id: z.string(),
      organization_id: z.string(),
      created_at: timestamp,
      updated_at: timestamp,
      status: z.string(),
      order_id: z.string(),
      kind: z.enum(["DEPOSIT", "BALANCE", "REFUND"]),
      custom_fields: z.unknown(),
      note: z.string().nullable(),
      payment_method: z.string().nullable(),
      reference: z.string().nullable(),
      evidence_asset_id: z.string().nullable(),
      collected_by: z.string(),
      collected_at: timestamp,
    })
  ),
  greeting_sessions: z.array(
    z.strictObject({
      id: z.string(),
      status: z.string(),
      send_code: z.string(),
      selected_product_id: z.string().nullable(),
      product_snapshot: z.unknown(),
      payment_proof_asset_id: z.string().nullable(),
      payment_proof_balance_asset_id: z.string().nullable(),
    })
  ),
  customer: customerRef.nullable(),
  qc_records: z.array(z.strictObject({ created_at: timestamp, notes: z.string().nullable() })),
  paymentProofUrl: z.string().nullable(),
  paymentProofAnalysis: z.unknown(),
  paymentProofBalanceUrl: z.string().nullable(),
  paymentProofBalanceAnalysis: z.unknown(),
  /** Tiền còn phải hoàn của đề xuất huỷ đã duyệt, chưa xử lý xong. */
  pending_refund_vnd: z.number().nullable(),
  product: orderProduct,
})
export const gcOrdersResponse = z.strictObject({ data: z.array(gcOrderRow), next_cursor: z.string().nullable() })

const payment = {
  ...ref,
  status: z.string(),
  paidVnd: z.number(),
  balanceVnd: z.number(),
  kind: z.enum(["DEPOSIT", "BALANCE"]),
  paymentId: z.string(),
  productionStatus: z.string().optional(),
  autoAccepted: z.boolean().optional(),
}
/** Sau khi xác nhận tiền: đơn chuỗi tự mời chi nhánh (`AUTO`) hoặc chờ Điều phối chọn (`MANUAL`). */
const dispatch = z.union([
  z.strictObject({ mode: z.enum(["NOT_CHAIN", "MANUAL", "ALREADY_DISPATCHED"]) }),
  z.strictObject({ mode: z.literal("AUTO"), dispatched: z.boolean(), sentCount: z.number(), reason: z.string().optional() }),
])
export const paymentConfirmedResponse = data(z.strictObject({ ...payment, dispatch }))
export const balanceConfirmedResponse = data(z.strictObject(payment))
export const confirmOrderResponse = data(
  z.strictObject({ success: z.boolean(), ...ref, productionStatus: z.literal("ASSIGNED"), message: z.string() })
)
export const rejectProposalResponse = data(z.strictObject({ success: z.boolean(), message: z.string(), proposalId: z.string() }))
export const deliveryFailedResponse = data(z.strictObject({ ...ref, feeVnd: z.number(), totalVnd: z.number() }))
export const gcCancelResponse = data(z.strictObject({ ...ref, status: z.literal("CANCELLED"), paidVnd: z.number() }))
export const gcQuoteResponse = data(z.strictObject({ ...ref, totalVnd: z.number(), balanceVnd: z.number(), promotionDiscountVnd: z.number() }))
export const refundResponse = data(z.strictObject({ ...ref, paidVnd: z.number(), refundedVnd: z.number() }))
export const rejectReportedPaymentResponse = data(z.strictObject({ ...ref, reason: z.string() }))
export const discountRequestResponse = data(z.strictObject({ id: z.string(), createdAt: z.string() }))

const vat = {
  orderId: z.string(),
  vatEnabled: z.boolean(),
  vatRate: z.number(),
  vatAmountVnd: z.number(),
  subtotalVnd: z.number(),
  totalVnd: z.number(),
  paidVnd: z.number(),
  balanceVnd: z.number(),
  companyName: z.string().nullable(),
  taxCode: z.string().nullable(),
  companyAddress: z.string().nullable(),
  email: z.string().nullable(),
}
/** Phiếu đơn: VAT + mã/ảnh sản phẩm, ghi chú khách và giao hàng. */
export const orderSlipResponse = data(
  z.strictObject({
    ...vat,
    productCode: z.string().nullable(),
    productImageUrl: z.string().nullable(),
    productDriveLink: z.string().nullable(),
    customerNote: z.string().nullable(),
    deliveryNote: z.string().nullable(),
  })
)
export const gcVatResponse = data(z.strictObject(vat))

const craftFeeLine = z.strictObject({ label: z.string(), amountVnd: z.number() })
export const craftFeeResponse = data(
  z.strictObject({ feeLabel: z.string(), suggestedVnd: z.number(), lines: z.array(craftFeeLine), adjustPercent: z.number() })
)
export const chainDispatchStateResponse = data(
  z.strictObject({
    orderCode: z.string(),
    deliveryAddress: z.string(),
    deliveryLocationResolved: z.boolean(),
    dispatchState: z
      .strictObject({
        status: z.enum(["OPEN", "CLAIMED_GRACE", "COMMITTED", "ESCALATED", "CANCELLED"]),
        claimedBranchId: z.string().nullable(),
        claimedBranchName: z.string().nullable().optional(),
        claimedAt: z.string().nullable(),
        graceExpiresAt: z.string().nullable(),
        remindersSent: z.record(z.string(), z.string()).optional(),
      })
      .nullable(),
    topBranches: z.array(
      z.strictObject({
        branchId: z.string(),
        branchName: z.string(),
        distanceKm: z.number().nullable(),
        areaMatch: z.enum(["WARD", "DISTRICT", "PROVINCE", "OTHER_PROVINCE", "UNKNOWN"]).nullable(),
        qualityScore: z.number(),
        activeJobsCount: z.number(),
        totalScore: z.number(),
        rank: z.number(),
        channels: z.strictObject({ hasTelegram: z.boolean(), telegramLinked: z.boolean(), hasZalo: z.boolean(), phone: z.string().nullable().optional() }),
      })
    ),
    craftFee: z.strictObject({
      feeLabel: z.string(),
      suggestedVnd: z.number(),
      lines: z.array(craftFeeLine),
      adjustPercent: z.number(),
      finalVnd: z.number().nullable(),
    }),
    policy: z.strictObject({ topN: z.number(), claimWindowMinutes: z.number() }),
  })
)
export const chainDispatchStartResponse = data(
  z.strictObject({
    dispatched: z.boolean(),
    orderCode: z.string(),
    sentCount: z.number(),
    totalTargeted: z.number(),
    results: z.array(z.strictObject({ branchId: z.string(), branchName: z.string(), sent: z.boolean(), channel: z.string(), error: z.string().optional() })),
    claimUrl: z.string(),
  })
)

const ANSWER = z.enum(["PENDING", "ANSWERED"])
const productOption = z.strictObject({
  productId: z.string(),
  code: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  driveLink: z.string().nullable(),
  priceVnd: z.number(),
})
const productProposal = z.strictObject({
  status: ANSWER,
  reason: z.string(),
  original: z.strictObject({ productId: z.string(), name: z.string() }),
  options: z.array(productOption),
  proposedBy: z.string(),
  proposedAt: z.string(),
  choice: z.enum(["OPTION", "SHOP_DECIDES", "CANCEL"]).optional(),
  chosenProductId: z.string().optional(),
  customerNote: z.string().optional(),
  answeredAt: z.string().optional(),
  id: z.string(),
})
export const substituteOptionsResponse = data(
  z.strictObject({
    current: z.strictObject({ productId: z.string(), name: z.string() }),
    lockedReason: z.string().nullable(),
    options: z.array(productOption),
    latest: productProposal.nullable(),
  })
)
export const substituteProposalResponse = data(productProposal)

const bomLine = z.strictObject({
  index: z.number(),
  flowerName: z.string(),
  quantity: z.number(),
  unit: z.string().nullable(),
  color: z.string().nullable(),
  role: z.string().nullable(),
})
const flowerProposal = z.strictObject({
  kind: z.literal("FLOWER"),
  status: ANSWER,
  reason: z.string(),
  productName: z.string(),
  line: bomLine,
  replacement: z.strictObject({ flowerName: z.string(), color: z.string().nullable(), photoAssetId: z.string() }),
  proposedBy: z.string(),
  proposedAt: z.string(),
  choice: z.enum(["ACCEPT", "DECLINE"]).optional(),
  customerNote: z.string().optional(),
  answeredAt: z.string().optional(),
  id: z.string(),
})
export const flowerSubstituteOptionsResponse = data(
  z.strictObject({ productName: z.string(), lines: z.array(bomLine), lockedReason: z.string().nullable(), latest: flowerProposal.nullable() })
)
export const flowerSubstituteProposalResponse = data(flowerProposal)

