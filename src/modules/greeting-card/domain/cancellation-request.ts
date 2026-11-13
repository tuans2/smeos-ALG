/**
 * Đề xuất Hủy đơn & Hoàn tiền theo Thẻ chào (Task #1).
 * Luồng: Sale / Điều phối đề xuất -> Điều hành duyệt (APPROVE / REJECT) -> Cập nhật Đơn / Sổ thu.
 * Pure TypeScript — không phụ thuộc DB hay Prisma.
 */

export type CancellationType = "CANCEL_ONLY" | "FULL_REFUND" | "PARTIAL_REFUND"
export type CancellationStatus = "PENDING" | "APPROVED" | "REJECTED"

export const CANCELLATION_TYPE_LABEL: Record<CancellationType, string> = {
  CANCEL_ONLY: "Hủy đơn (không hoàn tiền)",
  FULL_REFUND: "Hủy đơn & Hoàn tiền toàn phần",
  PARTIAL_REFUND: "Hoàn tiền một phần",
}

export interface CancellationProposal {
  type: CancellationType
  reason: string
  refundAmountVnd: number
  note?: string | undefined
}

export interface CancellationPayload extends CancellationProposal {
  status: CancellationStatus
  orderId: string
  orderCode: string
  totalVnd: number
  paidVnd: number
  proposedBy: string
  proposedAt: string
  decidedBy?: string | undefined
  decidedAt?: string | undefined
  decidedNote?: string | undefined
  actualRefundVnd?: number | undefined
  /** Hệ thống tự duyệt vì Điều hành không phản hồi kịp hạn (không phải người bấm). */
  autoApproved?: boolean | undefined
  /** Việc Điều hành còn phải làm sau khi hệ thống tự huỷ — hiện ở Hộp việc tới khi đánh dấu xong. */
  followUp?: CancellationFollowUp | undefined
}

export interface CancellationFollowUp {
  status: "PENDING" | "DONE"
  /** Số tiền phải chuyển hoàn cho khách (hệ thống không tự chuyển tiền, chưa ghi sổ thu). */
  refundDueVnd: number
  doneBy?: string | undefined
  doneAt?: string | undefined
  note?: string | undefined
}

/** Đơn tự huỷ còn chờ Điều hành xử lý (hoàn tiền / liên hệ khách). */
export function needsFollowUp(payload: Pick<CancellationPayload, "status" | "followUp">): boolean {
  return payload.status === "APPROVED" && payload.followUp?.status === "PENDING"
}

/**
 * Kiểm tra xem đơn hàng có đủ điều kiện để nhân viên đề xuất hủy/hoàn tiền hay không.
 * Nguyên tắc: đề xuất được khi chưa cắm, khi đã cắm xong chờ giao, hoặc khi đang giao (PO 15/10/2026);
 * chặn lúc thợ đang cắm (đã phân công / đang cắm / chờ kiểm) — liên hệ trực tiếp Điều hành.
 */
export function canProposeCancellation(order: {
  status: string
  productionStatus?: string | null | undefined
  deliveryStatus?: string | null | undefined
}): { allowed: boolean; reason?: string } {
  if (order.status === "CANCELLED") {
    return { allowed: false, reason: "Đơn hàng này đã bị hủy trước đó." }
  }
  if (order.status === "COMPLETED" || order.deliveryStatus === "DELIVERED") {
    return { allowed: false, reason: "Đơn hàng đã giao hoàn tất, không thể hủy." }
  }
  // Đơn đang giao: được đề xuất huỷ, kèm cảnh báo, và phải có người duyệt (PO 15/10/2026, mục 6)
  if (isInTransit(order.deliveryStatus)) return { allowed: true }
  // Hoa đã cắm xong, chưa giao: được đề xuất huỷ — Điều hành duyệt (PO 15/10/2026)
  if (order.productionStatus === "READY") return { allowed: true }
  if (order.productionStatus && order.productionStatus !== "WAITING") {
    return {
      allowed: false,
      reason: "Thợ đang chế tác, chưa đề xuất hủy được. Vui lòng liên hệ trực tiếp Điều hành.",
    }
  }
  return { allowed: true }
}

/**
 * Kiểm tra tính hợp lệ của đề xuất hủy / hoàn tiền.
 * Trả về chuỗi lỗi tiếng Việt nếu không hợp lệ, hoặc null nếu hợp lệ.
 */
export function validateCancellationProposal(
  proposal: CancellationProposal,
  order: {
    status: string
    totalVnd: number
    paidVnd: number
    productionStatus?: string | null | undefined
    deliveryStatus?: string | null | undefined
  }
): string | null {
  const check = canProposeCancellation(order)
  if (!check.allowed) {
    return check.reason ?? "Không thể đề xuất hủy/hoàn cho đơn này."
  }
  if (!proposal.reason || proposal.reason.trim().length < 3) {
    return "Vui lòng nhập lý do hủy/hoàn tiền chi tiết (tối thiểu 3 ký tự)."
  }

  const refund = Math.max(0, Math.round(proposal.refundAmountVnd || 0))

  if (proposal.type === "FULL_REFUND") {
    if (order.paidVnd <= 0) {
      return "Đơn hàng chưa thu tiền, không thể hoàn tiền toàn phần (chọn Hủy đơn)."
    }
  }

  if (proposal.type === "PARTIAL_REFUND") {
    if (order.paidVnd <= 0) {
      return "Đơn hàng chưa có khoản thu nào để hoàn tiền."
    }
    if (refund <= 0) {
      return "Số tiền hoàn một phần phải lớn hơn 0đ."
    }
    if (refund >= order.paidVnd) {
      return `Số tiền hoàn một phần phải nhỏ hơn tổng số tiền đã thu (${order.paidVnd.toLocaleString("vi-VN")}đ). Nếu hoàn toàn bộ, hãy chọn Hoàn tiền toàn phần.`
    }
  }

  if (refund > order.paidVnd) {
    return `Số tiền hoàn không được vượt quá số tiền khách đã trả (${order.paidVnd.toLocaleString("vi-VN")}đ).`
  }

  return null
}

/**
 * Kiểm tra dữ liệu đề xuất (không kiểm tra trạng thái vòng đời đơn hàng).
 * Dùng khi tạo đề xuất (createProposal) — trạng thái đơn do Điều hành kiểm khi duyệt (decide).
 */
export function validateCancellationProposalData(
  proposal: CancellationProposal,
  order: { totalVnd: number; paidVnd: number }
): string | null {
  if (!proposal.reason || proposal.reason.trim().length < 3) {
    return "Vui lòng nhập lý do hủy/hoàn tiền chi tiết (tối thiểu 3 ký tự)."
  }
  const refund = Math.max(0, Math.round(proposal.refundAmountVnd || 0))
  if (proposal.type === "FULL_REFUND" && order.paidVnd <= 0) {
    return "Đơn hàng chưa thu tiền, không thể hoàn tiền toàn phần (chọn Hủy đơn)."
  }
  if (proposal.type === "PARTIAL_REFUND") {
    if (order.paidVnd <= 0) return "Đơn hàng chưa có khoản thu nào để hoàn tiền."
    if (refund <= 0) return "Số tiền hoàn một phần phải lớn hơn 0đ."
    if (refund >= order.paidVnd) {
      return `Số tiền hoàn một phần phải nhỏ hơn tổng số tiền đã thu (${order.paidVnd.toLocaleString("vi-VN")}đ). Nếu hoàn toàn bộ, hãy chọn Hoàn tiền toàn phần.`
    }
  }
  if (refund > order.paidVnd) {
    return `Số tiền hoàn không được vượt quá số tiền khách đã trả (${order.paidVnd.toLocaleString("vi-VN")}đ).`
  }
  return null
}

/**
 * Số tiền hoàn thực tế khi Điều hành duyệt — máy chủ tự tính, không tin client:
 * Hủy đơn không hoàn → 0; Hoàn toàn phần → đúng số đã thu; Hoàn một phần → số Điều hành
 * chốt (hoặc số đề xuất), không âm.
 */
export function resolveRefundVnd(
  type: CancellationType,
  paidVnd: number,
  requestedVnd: number | undefined,
  actualVnd: number | undefined,
): number {
  if (type === "CANCEL_ONLY") return 0
  if (type === "FULL_REFUND") return Math.max(0, Math.round(paidVnd))
  return Math.max(0, Math.round(actualVnd ?? requestedVnd ?? 0))
}

/** Shipper đang cầm hoa đi giao (PO 15/10/2026, mục 6): huỷ được nhưng phải có người duyệt, kèm cảnh báo. */
export function isInTransit(deliveryStatus: string | null | undefined): boolean {
  return deliveryStatus === "DISPATCHED" || deliveryStatus === "DELIVERING"
}

export const IN_TRANSIT_CANCEL_WARNING = "Shipper đang trên đường giao hoa — huỷ lúc này cần báo shipper quay về và có thể mất phí giao"

/**
 * Ai được duyệt đề xuất (PO 15/10/2026): duyệt huỷ CHỈ đổi trạng thái, không chuyển tiền — hoàn tiền là bước
 * riêng (R10) ở danh sách "Cần hoàn tiền". Huỷ → R6; đơn đang giao thì Điều phối (R5) cũng được duyệt, nhưng
 * không tự duyệt đề xuất của chính mình. Chỉ hoàn một phần (không huỷ) → R10.
 */
export function canDecideCancellation(
  type: CancellationType,
  ctx: { capabilities: ReadonlySet<string>; userId: string },
  input: { inTransit: boolean; requesterId: string },
  caps: { orderCancel: string; paymentRefund: string; deliveryManage: string },
): string | null {
  if (type === "PARTIAL_REFUND") return ctx.capabilities.has(caps.paymentRefund) ? null : "Bạn không có quyền duyệt hoàn tiền"
  if (ctx.capabilities.has(caps.orderCancel)) return null
  if (input.inTransit && ctx.capabilities.has(caps.deliveryManage)) {
    return input.requesterId === ctx.userId ? "Không tự duyệt đề xuất huỷ của chính mình — cần người khác duyệt" : null
  }
  return "Bạn không có quyền duyệt huỷ đơn"
}


/** Nội dung tin báo Điều hành khi hệ thống tự duyệt huỷ đơn. */
export function autoApprovedNotice(orderCode: string, timeoutMinutes: number, refundDueVnd: number): string {
  const refund = refundDueVnd > 0 ? ` Cần chuyển hoàn ${refundDueVnd.toLocaleString("vi-VN")}đ cho khách rồi bấm "Đã hoàn tiền cho khách" trong Hộp việc.` : ""
  return `Đơn ${orderCode} đã tự huỷ do quá ${timeoutMinutes} phút chưa có quyết định cho đề xuất từ chối nhận đơn của Điều phối.${refund}`
}
