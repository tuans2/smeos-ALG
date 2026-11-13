/** Mã năng lực của trao đổi nội bộ (catalog `src/core/rbac/capability-catalog.ts`, nhóm S — PO duyệt D2). */
export const INTERNAL_CHAT_CAPABILITY = {
  /** Dùng trao đổi nội bộ: xem phòng, đọc, gửi tin */
  use: "S1",
  /** Nhận và cập nhật đơn gia công được giao */
  fulfilOrder: "S2",
} as const
