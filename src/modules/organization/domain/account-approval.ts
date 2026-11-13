/**
 * Duyệt tài khoản tự đăng ký (PO 22/10/2026): trong giai đoạn kiểm soát số người dùng, tài khoản
 * tạo qua `/auth/signup` hoặc `/auth/instant-trial` bắt đầu ở `PENDING`. Chỉ `APPROVED` mới đăng
 * nhập và dùng phiên được. Superadmin nền tảng (mã `N13`) duyệt ở Console `/van-hanh/dang-ky`.
 */
export type AccountApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

export const PENDING_APPROVAL_MESSAGE =
  "Đăng ký đã được ghi nhận và đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được ngay sau khi được duyệt."

export const LOGIN_PENDING_MESSAGE = "Tài khoản của bạn đang chờ quản trị viên duyệt, chưa đăng nhập được."

export const LOGIN_REJECTED_MESSAGE = "Tài khoản này chưa được cấp quyền sử dụng. Vui lòng liên hệ quản trị viên."

export function canSignIn(status: AccountApprovalStatus): boolean {
  return status === "APPROVED"
}

/** Thông báo khi đăng nhập đúng mật khẩu nhưng chưa được dùng — `null` nếu được dùng. */
export function signInBlockedMessage(status: AccountApprovalStatus): string | null {
  if (status === "PENDING") return LOGIN_PENDING_MESSAGE
  if (status === "REJECTED") return LOGIN_REJECTED_MESSAGE
  return null
}
