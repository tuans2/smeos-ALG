/**
 * Đối soát chuyển khoản ngân hàng ↔ đơn Thẻ chào. Pure TypeScript.
 *
 * Nội dung chuyển khoản do khách gõ/ứng dụng ngân hàng sinh ra thường bị
 * biến dạng: viết thường, mất dấu "-", chèn khoảng trắng, kèm tiền tố
 * "MBVCB.123 ..." — nên dò mã đơn bằng mẫu nới lỏng rồi chuẩn hoá lại.
 */

const ORDER_CODE_IN_TEXT = /DH\s*(\d{6})\s*[-_.\s]?\s*([0-9A-Z]{8})(?![0-9A-Z])/

/** Mã đơn chuẩn `DHyymmdd-XXXXXXXX` tìm thấy trong nội dung, hoặc `null`. */
export function extractOrderCode(content: string): string | null {
  const m = ORDER_CODE_IN_TEXT.exec(content.toUpperCase())
  return m ? `DH${m[1]}-${m[2]}` : null
}

export type TransferDecision =
  | { kind: "RECORD"; amountVnd: number; note: string | null }
  | { kind: "UNMATCHED"; note: string }

/**
 * Quyết định ghi thu cho một giao dịch đã khớp mã đơn. Chuyển thừa → chỉ ghi
 * đúng phần còn phải thu, phần thừa để Điều hành xử lý (hoàn/ghi chú).
 */
export function decideTransfer(
  order: { status: string; totalVnd: number; paidVnd: number } | null,
  amountVnd: number
): TransferDecision {
  if (!order) return { kind: "UNMATCHED", note: "Không tìm thấy đơn khớp nội dung chuyển khoản" }
  if (order.status === "CANCELLED") return { kind: "UNMATCHED", note: "Đơn đã huỷ — cần hoàn tiền cho khách" }
  const balance = order.totalVnd - order.paidVnd
  if (balance <= 0) return { kind: "UNMATCHED", note: "Đơn đã thu đủ — khách chuyển thừa, cần hoàn" }
  if (amountVnd > balance) {
    return {
      kind: "RECORD",
      amountVnd: balance,
      note: `Khách chuyển thừa ${(amountVnd - balance).toLocaleString("vi-VN")} đ — cần hoàn phần thừa`,
    }
  }
  return { kind: "RECORD", amountVnd, note: null }
}
