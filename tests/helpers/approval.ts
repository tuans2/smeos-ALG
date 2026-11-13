import { prisma } from "@/core/tenancy/infra/prisma"
import { AccountApprovalRepository } from "@/modules/platform/infra/account-approval-repository"
import { logIn } from "@/modules/organization/use-cases/log-in"

/**
 * Đăng ký công khai và dùng thử chờ superadmin duyệt (PO 22/10/2026). Duyệt qua đúng repository
 * console dùng, rồi đăng nhập thật; dùng thử nhận mật khẩu tạm từ bước duyệt. Trả token phiên.
 */
export async function approveAndLogIn(userId: string, email: string, password?: string): Promise<string> {
  const decided = await new AccountApprovalRepository().decide(userId, "APPROVE", "test-superadmin")
  const usable = decided.temporaryPassword ?? password
  if (!usable) throw new Error("Cần mật khẩu: tài khoản đăng ký thường không được cấp mật khẩu tạm")
  // Mật khẩu tạm phải đổi ở lần đầu (checklist ALG 1.4, test riêng temporary-password-gate.test.ts) —
  // helper giả lập người dùng đã đổi để các test khác dùng được phiên.
  if (decided.temporaryPassword) await prisma.users.update({ where: { id: userId }, data: { must_change_password: false } })
  return (await logIn({ email, password: usable })).token
}
