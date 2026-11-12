import { AppError } from "@/core/http/errors"
import { signInBlockedMessage } from "@/modules/organization/domain/account-approval"
import { normalizeEmail } from "@/modules/organization/domain/credentials"
import { expiresAt } from "@/modules/organization/domain/session-policy"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { verifyPassword } from "@/modules/organization/infra/password-hasher"
import { SessionRepository, getSessionRepository } from "@/modules/organization/infra/session-repository"
import { hashSessionToken, newSessionToken } from "@/modules/organization/infra/session-token"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { assertOrganizationLifecycle } from "./assert-organization-lifecycle"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"

export type LogInInput = { email: string; password: string }

export type LogInResult = {
  token: string
  userId: string
  organizationId: string | null
  // Unified Shell (B1) — để route mint JWT liên-app không cần tra lại user.
  email: string | null
}

/**
 * Sai email và sai mật khẩu trả về cùng một câu trả lời. Phân biệt hai trường
 * hợp là cho phép dò xem địa chỉ nào đã có tài khoản.
 */
function rejected(): AppError {
  return new AppError("UNAUTHENTICATED", "Email hoặc mật khẩu không đúng")
}

export async function logIn(input: LogInInput): Promise<LogInResult> {
  const users = getUserRepository()
  const memberships = getMembershipRepository()

  const email = normalizeEmail(input.email)
  const user = await users.findByEmail(email)
  if (!user || !user.password_hash) throw rejected()
  if (!(await verifyPassword(input.password, user.password_hash))) throw rejected()
  // Chỉ nói "chờ duyệt" SAU khi đúng mật khẩu — người không có mật khẩu không dò được trạng thái
  const blocked = signInBlockedMessage(user.approval_status)
  if (blocked) throw new AppError("CAPABILITY_DENIED", blocked, { reason: `ACCOUNT_${user.approval_status}` })

  // Tổ chức đang hoạt động của phiên chọn phía máy chủ, không nhận từ client.
  // Người dùng đổi nó về sau qua `POST /session/organization`.
  const membership = await memberships.findFirstActiveForUser(user.id)
  // Tổ chức tạm ngưng / đã đóng → không đăng nhập (ADR-016 D-S5); đang rời nền tảng vẫn vào xem được
  if (membership) await assertOrganizationLifecycle(membership.organization_id, "GET")

  const now = new Date()
  const token = newSessionToken()
  // Một tài khoản chỉ một phiên tại một thời điểm: người đăng nhập sau thắng,
  // mọi phiên cũ bị thu hồi cùng lúc (thiết bị cũ nhận cảnh báo — xem
  // `resolveSession`). Gói trong transaction để không có khoảnh khắc nào hai
  // phiên cùng sống.
  await runInTransaction(async (tx) => {
    const sessions = getSessionRepository(tx)
    await sessions.revokeAllActiveForUser(user.id, now)
    await sessions.create({
      user_id: user.id,
      token_hash: hashSessionToken(token),
      organization_id: membership?.organization_id ?? null,
      expires_at: expiresAt(now),
      created_at: now,
    })
  })

  return {
    token,
    userId: user.id,
    organizationId: membership?.organization_id ?? null,
    email: user.email,
  }
}
