/**
 * Mốc "vào bước hiện tại" của một đơn/link — để so với thời gian chuẩn từng bước.
 * Pure TypeScript: nhận dữ liệu thô đã đọc từ DB, không tự truy vấn.
 */

const latest = (dates: Array<Date | null | undefined>): Date | null =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null)

/**
 * Đơn: lần đổi trạng thái gần nhất (sự kiện đơn trừ ghi chú nội bộ, phiếu thu, duyệt ảnh),
 * không có thì lúc tạo đơn.
 */
export function orderStepStartedAt(order: {
  created_at: Date
  events?: Array<{ axis: string; created_at: Date }>
  payments?: Array<{ collected_at: Date }>
  qc_records?: Array<{ created_at: Date }>
}): string {
  const at = latest([
    order.created_at,
    ...(order.events ?? []).filter((e) => e.axis !== "internal_note").map((e) => e.created_at),
    ...(order.payments ?? []).map((p) => p.collected_at),
    ...(order.qc_records ?? []).map((q) => q.created_at),
  ])
  return (at ?? order.created_at).toISOString()
}

/** Link chưa có đơn: chưa mở → lúc gửi; đang xem/chọn → lúc mở; sau đó → lần cập nhật cuối. */
export function sessionStepStartedAt(session: {
  status: string
  created_at: Date
  opened_at?: Date | null
  updated_at?: Date | null
}): string {
  if (session.status === "CREATED") return session.created_at.toISOString()
  if (session.status === "OPENED" || session.status === "BROWSING" || session.status === "SELECTED") {
    return (session.opened_at ?? session.created_at).toISOString()
  }
  return (session.updated_at ?? session.created_at).toISOString()
}
