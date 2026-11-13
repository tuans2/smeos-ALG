/**
 * Giao không thành công / hẹn giao lại cho đơn Thẻ chào (PO duyệt 08/10/2026).
 * Điều phối ghi lý do khi shipper không giao được → `delivery_status = FAILED`, khách thấy trên
 * trang theo dõi và được đổi giờ/địa chỉ giao (luồng xin đổi thông tin); Điều phối giao ship lại.
 * Phí giao lại do tiệm cài (`brochure_shipping.redelivery_fee_vnd`, mặc định 0); Điều phối chọn
 * có tính cho lần này không (lỗi do tiệm thì không tính). Pure TypeScript.
 */

export const DELIVERY_FAILURE_REASONS = ["NO_ANSWER", "NOT_HOME", "WRONG_ADDRESS", "REFUSED", "OTHER"] as const
export type DeliveryFailureReason = (typeof DELIVERY_FAILURE_REASONS)[number]

export const DELIVERY_FAILURE_LABEL: Record<DeliveryFailureReason, string> = {
  NO_ANSWER: "Người nhận không nghe máy",
  NOT_HOME: "Không có ai nhận hoa",
  WRONG_ADDRESS: "Sai địa chỉ / không tìm thấy nơi nhận",
  REFUSED: "Người nhận từ chối nhận",
  OTHER: "Lý do khác",
}

export const FAILURE_NOTE_MAX = 300
export const MAX_REDELIVERY_FEE_VND = 10_000_000
/** Lưu tối đa chừng này lần giao hỏng trong `delivery_window.failures`. */
export const MAX_FAILURE_HISTORY = 20

export interface DeliveryFailureRecord {
  at: string
  reason: DeliveryFailureReason
  reasonLabel: string
  note: string | null
  feeVnd: number
  by: string
}

/** Phí giao lại tiệm cài; thiếu/sai → 0 (không thu). */
export function parseRedeliveryFee(settings: unknown): number {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const ship = root.brochure_shipping && typeof root.brochure_shipping === "object" ? (root.brochure_shipping as Record<string, unknown>) : {}
  const fee = ship.redelivery_fee_vnd
  return typeof fee === "number" && Number.isInteger(fee) && fee > 0 && fee <= MAX_REDELIVERY_FEE_VND ? fee : 0
}

/** Lỗi tiếng Việt cho lần ghi giao không thành công; `null` nếu hợp lệ. */
export function deliveryFailureError(input: { reason: DeliveryFailureReason; note?: string | undefined }): string | null {
  const note = input.note?.trim() ?? ""
  if (input.reason === "OTHER" && note.length < 3) return "Ghi rõ lý do giao không thành công (ít nhất 3 ký tự)"
  if (note.length > FAILURE_NOTE_MAX) return `Ghi chú tối đa ${FAILURE_NOTE_MAX} ký tự`
  return null
}

/**
 * Phí tính cho lần giao hỏng này: chỉ khi Điều phối chọn tính, tiệm có cài phí và đơn đã có giá
 * (đơn chờ báo giá — tổng 0 — cửa hàng gộp vào lúc báo giá).
 */
export function redeliveryFeeFor(input: { chargeFee: boolean; configuredFeeVnd: number; totalVnd: number }): number {
  return input.chargeFee && input.totalVnd > 0 ? input.configuredFeeVnd : 0
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** Các lần giao hỏng đã lưu (cũ → mới); dữ liệu hỏng bị bỏ qua. */
export function readDeliveryFailures(deliveryWindow: unknown): DeliveryFailureRecord[] {
  const list = rec(deliveryWindow).failures
  if (!Array.isArray(list)) return []
  return list.flatMap((f) => {
    const r = rec(f)
    const reason = r.reason as DeliveryFailureReason
    if (typeof r.at !== "string" || !DELIVERY_FAILURE_REASONS.includes(reason)) return []
    return [{
      at: r.at, reason, reasonLabel: DELIVERY_FAILURE_LABEL[reason],
      note: typeof r.note === "string" && r.note.trim() ? r.note.trim() : null,
      feeVnd: typeof r.feeVnd === "number" && r.feeVnd > 0 ? r.feeVnd : 0,
      by: typeof r.by === "string" ? r.by : "",
    }]
  })
}

/** `delivery_window` mới sau khi thêm một lần giao hỏng (giữ ngày/giờ và khoá khác). */
export function windowWithFailure(deliveryWindow: unknown, failure: DeliveryFailureRecord): Record<string, unknown> {
  const failures = [...readDeliveryFailures(deliveryWindow), failure].slice(-MAX_FAILURE_HISTORY)
  return { ...rec(deliveryWindow), failures }
}

/** Phần khách thấy trên trang theo dõi: lần giao hỏng gần nhất (ghi chú chỉ cho người đặt đã xác minh). */
export function latestFailureForCustomer(deliveryWindow: unknown, verified: boolean) {
  const last = readDeliveryFailures(deliveryWindow).at(-1)
  if (!last) return null
  return { at: last.at, reasonLabel: last.reasonLabel, note: verified ? last.note : null, feeVnd: last.feeVnd, attempts: readDeliveryFailures(deliveryWindow).length }
}
