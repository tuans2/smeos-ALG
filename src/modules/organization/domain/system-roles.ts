/**
 * Vai là **bản ghi**, không phải enum (`YC-Q5`). Bảng này chỉ là danh sách vai
 * hệ thống mà mọi tổ chức đều có sẵn; tổ chức thêm vai riêng của mình bằng
 * cách ghi thêm dòng vào `roles` với `organization_id` của nó.
 *
 * Năng lực gắn vào vai thuộc P2. Ở P1 vai mới chỉ là định danh.
 */

export const SYSTEM_ROLES = [
  { key: "dieu_hanh", name: "Điều hành" },
  { key: "dieu_phoi", name: "Điều phối" },
  { key: "sale", name: "Sale" },
  { key: "product_manager", name: "Quản lý sản phẩm" },
  { key: "marketing", name: "Marketing" },
  { key: "crm", name: "Chăm sóc khách hàng" },
  { key: "customer_service", name: "Chăm sóc khách hàng (CSKH)" },
  { key: "experience_user", name: "Người dùng trải nghiệm" },
  // PO 22/10/2026 — tài khoản của chi nhánh/cửa hàng nhận đơn gia công trong chuỗi (trang /cua-hang)
  { key: "cua_hang", name: "Cửa hàng nhận gia công" },
  // PO Q7 04/11/2026 — checklist ALG 1.12
  { key: "tho_cam", name: "Thợ chế tác" },
  { key: "shipper", name: "Shipper" },
  { key: "ke_toan", name: "Kế toán" },
] as const

export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"]

/** Vai gán cho người mở tổ chức: họ điều hành chính tổ chức mình vừa tạo. */
export const FOUNDER_ROLE_KEY: SystemRoleKey = "dieu_hanh"

export function isSystemRoleKey(value: string): value is SystemRoleKey {
  return SYSTEM_ROLES.some((role) => role.key === value)
}
