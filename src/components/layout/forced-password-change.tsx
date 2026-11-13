"use client"

import { useSession } from "@/lib/session"

import { ChangePasswordDialog } from "./change-password-dialog"

/**
 * Tài khoản đang dùng mật khẩu tạm (Điều hành tạo hoặc đặt lại) phải đổi mật khẩu trước khi dùng hệ
 * thống — checklist ALG 1.4. Máy chủ cũng chặn mọi API nghiệp vụ (`PASSWORD_CHANGE_REQUIRED`) tới khi đổi.
 */
export function ForcedPasswordChange() {
  const { mustChangePassword } = useSession()
  if (!mustChangePassword) return null
  return <ChangePasswordDialog open onOpenChange={() => undefined} required onChanged={() => window.location.reload()} />
}
