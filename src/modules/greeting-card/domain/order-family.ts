/**
 * Nhóm đơn của một khách trên cùng link Thẻ chào. "Đặt thêm đơn" tạo phiên mới (mã link mới) nối với
 * phiên trước qua sự kiện `REORDER { fromSendCode }` — nhóm = phiên gốc + mọi phiên đặt thêm từ đó.
 * Khách mở lại link cũ (từ tin nhắn Zalo…) phải về đúng chỗ đang làm dở, không về màn "Hoàn thành"
 * của đơn đầu; và xem lại được các đơn trước ở "Lịch sử đơn hàng". Pure TypeScript.
 */

/** Trần số phiên đọc trong một nhóm — vòng lần theo chuỗi luôn dừng. */
export const MAX_FAMILY_SIZE = 30

export interface FamilyMember {
  sendCode: string
  /** ISO — thứ tự tạo phiên */
  createdAt: string
  /** Mở được (link chưa có đơn mà đã hết hạn / thu hồi thì không) */
  available: boolean
  productName: string | null
  order: {
    code: string
    status: string
    deliveryStatus: string
    totalVnd: number
    paidVnd: number
    deliveryDate: string | null
  } | null
}

/** Trạng thái đơn bằng lời cho khách (không mã kỹ thuật). */
export function customerOrderStatusLabel(m: Pick<FamilyMember, "order">): string {
  const o = m.order
  if (!o) return "Đang chọn mẫu — chưa gửi đơn"
  if (o.status === "CANCELLED") return "Đã huỷ"
  if (o.status === "COMPLETED" || o.deliveryStatus === "DELIVERED") return "Đã giao"
  if (o.deliveryStatus === "DELIVERING" || o.deliveryStatus === "DISPATCHED") return "Đang giao"
  if (o.deliveryStatus === "FAILED") return "Giao chưa thành công"
  if (o.totalVnd <= 0) return "Chờ cửa hàng báo giá"
  if (o.paidVnd <= 0) return "Chờ thanh toán"
  if (o.paidVnd < o.totalVnd) return "Đã đặt cọc — đang chuẩn bị"
  return "Đã thanh toán — đang chuẩn bị"
}

/**
 * Mở link `current` thì nên ở phiên nào: chỗ khách đứng lần trước trên máy này (nếu vẫn thuộc nhóm và mở
 * được), không thì phiên mới nhất còn mở được. `null` = ở yên trang hiện tại.
 */
export function familyResumeTarget(
  members: readonly Pick<FamilyMember, "sendCode" | "createdAt" | "available">[],
  current: string,
  remembered: string | null,
): string | null {
  const usable = members.filter((m) => m.available)
  if (usable.length <= 1) return null
  const pick =
    (remembered && usable.find((m) => m.sendCode === remembered)) ||
    [...usable].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1)
  return pick && pick.sendCode !== current ? pick.sendCode : null
}

/**
 * Có hiện nút "Lịch sử đơn hàng" không: khách đã bắt đầu đơn thứ hai trở đi (≥ 2 phiên trong nhóm, ít nhất
 * một đơn đã gửi) — đang đặt dở đơn 2 cũng cần xem lại đơn 1.
 */
export function showOrderHistory(members: readonly Pick<FamilyMember, "order">[]): boolean {
  return members.length >= 2 && members.some((m) => m.order)
}
