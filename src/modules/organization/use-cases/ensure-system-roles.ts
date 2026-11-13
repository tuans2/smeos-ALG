import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { runInTransaction } from "@/modules/organization/infra/transaction"

/**
 * Nạp bốn vai hệ thống. Chạy bằng `npm run db:seed`, một lần sau khi đẩy lược
 * đồ; bộ test gọi lại sau mỗi lần dọn bảng.
 *
 * Đăng ký **không** gọi hàm này. Tạo dữ liệu danh mục trong đường đăng ký là
 * đường sinh ra vai trùng khi hai người đăng ký cùng lúc; thiếu vai hệ thống
 * là lỗi cài đặt và phải hỏng to ở lần đăng ký đầu tiên, không phải tự vá âm
 * thầm.
 */
export function ensureSystemRoles(): Promise<void> {
  return runInTransaction(async (tx) => {
    await getRoleRepository(tx).ensureSystemRoles()
  })
}
