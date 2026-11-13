/**
 * dispatch-message-titles.ts
 *
 * Mẫu tiêu đề chuẩn hóa cho tin nhắc/báo động gửi chi nhánh trong hệ thống bắn đơn gia công.
 * SSOT cho câu chữ tiêu đề — các use-case nhắc việc (M3 QC, M4 Shipper, M4 giao hàng…) gọi về đây
 * thay vì tự viết tiêu đề riêng, để tránh trùng/lệch câu chữ giữa các luồng (rà soát 23/10/2026).
 *
 * Quy ước 3 cấp độ, đặt tên giống nhau ở mọi luồng:
 * - "normal": tin nhắc đầu tiên, không thêm tiền tố mức độ.
 * - "retry": nhắc lần 2.
 * - "escalate": báo động cho Điều phối can thiệp (mức cao nhất).
 */

export type DispatchAlertLevel = "normal" | "retry" | "escalate"

const ALERT_LABEL: Record<DispatchAlertLevel, string | null> = {
  normal: null,
  retry: "Nhắc lần 2",
  escalate: "Khẩn cấp",
}

/**
 * Dựng tiêu đề tin chuẩn hóa: `{emoji} {Nhãn việc}{ — Nhãn mức độ} — Đơn #{orderCode}`.
 * Không dùng ngoặc vuông kiểu mã kỹ thuật, không ALL CAPS — theo CLAUDE.md và UX Lint R8/R12.
 */
export function buildDispatchTitle(params: {
  emoji: string
  action: string
  level: DispatchAlertLevel
  orderCode: string
}): string {
  const label = ALERT_LABEL[params.level]
  const prefix = label ? `${label}: ${params.action}` : params.action
  return `${params.emoji} ${prefix} — Đơn #${params.orderCode}`
}
