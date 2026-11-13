import { firstPaymentAmountVnd } from "./payment-plan"

/**
 * Đơn Thẻ chào mà khách đã gửi bill / báo chuyển khoản, Điều phối đã tiếp nhận đơn, nhưng Điều hành
 * chưa ghi nhận tiền vào sổ thu (`paid_vnd = 0`). PO 15/10/2026:
 * - Nội bộ: giữ đúng sổ thu (0 đ) và ghi chú "Điều hành chưa duyệt đã nhận tiền".
 * - Khách: hiển thị đã nhận khoản Lần 1 để khách an tâm (chỉ hiển thị, không ghi sổ).
 * Điều hành bấm "Chưa nhận được tiền" → bỏ báo chuyển khoản/bill → trạng thái này tự hết.
 */
export interface DepositAckInput {
  status: string
  productionStatus: string | null | undefined
  totalVnd: number
  paidVnd: number
  /** Khách đã gửi ảnh bill hoặc bấm "Tôi đã chuyển khoản" (Lần 1). */
  customerReported: boolean
}

const ACCEPTED_PRODUCTION = new Set(["ASSIGNED", "ARRANGING", "READY", "DONE"])

export const DEPOSIT_PENDING_APPROVAL_NOTE = "Đơn do Điều phối xác nhận – Điều hành chưa duyệt đã nhận tiền"

export function isDepositPendingApproval(o: DepositAckInput): boolean {
  if (o.status === "CANCELLED" || o.totalVnd <= 0 || o.paidVnd > 0 || !o.customerReported) return false
  return o.status === "CONFIRMED" || o.status === "PROCESSING" || ACCEPTED_PRODUCTION.has(o.productionStatus ?? "")
}

/** Số tiền khách nhìn thấy là "đã thanh toán": sổ thu, hoặc khoản Lần 1 khi đơn đã được tiếp nhận như trên. */
export function customerVisiblePaidVnd(o: DepositAckInput & { pricingRuleRef: unknown }, shopDepositPercent: number): number {
  if (!isDepositPendingApproval(o)) return o.paidVnd
  return firstPaymentAmountVnd(o.totalVnd, o.pricingRuleRef, shopDepositPercent)
}
