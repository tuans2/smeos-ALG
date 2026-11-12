/** Câu báo khi báo giá đã lưu (nháp) nhưng gửi khách không thành — không nuốt lỗi (audit BL-31, 11/11/2026). */
export function unsentMessage(err: unknown): string {
  const reason = err instanceof Error && err.message.trim() ? ` (${err.message.trim()})` : ""
  return `Đã lưu báo giá nháp nhưng chưa gửi được cho khách${reason}. Mở danh sách báo giá để gửi lại.`
}
