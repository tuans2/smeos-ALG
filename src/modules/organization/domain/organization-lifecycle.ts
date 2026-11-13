/**
 * Vòng đời tổ chức (ADR-016 D-S5, bước S-3a) — luật thuần, không import Prisma.
 *
 * - `ACTIVE`: dùng bình thường.
 * - `SUSPENDED`: chặn mọi truy cập của thành viên (đăng nhập, xem, ghi); dữ liệu giữ nguyên.
 * - `OFFBOARDING`: khách đang rời nền tảng — chỉ xem để xuất bàn giao, không ghi; xoá sau `offboarding_until`.
 * - `DELETED`: đã xoá theo sổ bảng-thuộc-tenant (S-3b) — không ai vào được.
 */
export const ORGANIZATION_LIFECYCLE_STATUSES = ["ACTIVE", "SUSPENDED", "OFFBOARDING", "DELETED"] as const
export type OrganizationLifecycleStatus = (typeof ORGANIZATION_LIFECYCLE_STATUSES)[number]

/** Trạng thái Admin SaaS đặt được qua Console. `DELETED` chỉ do đường xoá tenant (S-3b) đặt. */
export const SETTABLE_LIFECYCLE_STATUSES = ["ACTIVE", "SUSPENDED", "OFFBOARDING"] as const
export type SettableLifecycleStatus = (typeof SETTABLE_LIFECYCLE_STATUSES)[number]

export type LifecycleAccess = "full" | "read-only" | "blocked"

export function lifecycleAccess(status: OrganizationLifecycleStatus): LifecycleAccess {
  if (status === "ACTIVE") return "full"
  if (status === "OFFBOARDING") return "read-only"
  return "blocked"
}

/** Thành viên vào được tổ chức này không (xem hoặc làm) — `false` với tổ chức tạm ngưng / đã đóng. */
export function canEnterOrganization(status: OrganizationLifecycleStatus): boolean {
  return lifecycleAccess(status) !== "blocked"
}

/** Đổi trạng thái hợp lệ: tổ chức đã xoá không đổi lại được; không tự chuyển sang `DELETED` qua Console. */
export function canChangeLifecycle(from: OrganizationLifecycleStatus, to: OrganizationLifecycleStatus): boolean {
  if (from === "DELETED" || to === "DELETED") return false
  return from !== to
}

/** Câu báo cho thành viên — tiếng Việt tự nhiên, không mã kỹ thuật. */
export function lifecycleBlockedMessage(status: OrganizationLifecycleStatus): string {
  if (status === "OFFBOARDING") return "Cửa hàng đang trong thời gian kết thúc dịch vụ — chỉ xem và tải dữ liệu, không thay đổi được."
  if (status === "DELETED") return "Tài khoản cửa hàng này đã đóng."
  return "Tài khoản cửa hàng đang tạm ngưng. Vui lòng liên hệ bộ phận hỗ trợ."
}

/**
 * Banner trên ứng dụng của tổ chức không hoạt động (audit User Journey UJ-26, PO 12/11/2026 UQ13) — cùng câu với lỗi
 * máy chủ trả, để người dùng biết vì sao thao tác bị chặn thay vì gặp lỗi rời rạc ở từng nút. `null` = không hiện.
 */
export function lifecycleBanner(status: string | null | undefined): { tone: "danger" | "warning"; message: string } | null {
  if (status === "SUSPENDED" || status === "DELETED") return { tone: "danger", message: lifecycleBlockedMessage(status) }
  if (status === "OFFBOARDING") return { tone: "warning", message: lifecycleBlockedMessage(status) }
  return null
}
