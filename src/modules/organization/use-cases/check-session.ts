import { sessionSuperseded, unauthenticated } from "@/core/http/errors"
import { asSystemDb } from "@/core/tenancy/db-context"
import { isUsable } from "@/modules/organization/domain/session-policy"
import { SessionRepository, getSessionRepository } from "@/modules/organization/infra/session-repository"
import { hashSessionToken } from "@/modules/organization/infra/session-token"

import { sessionTokenFrom } from "./resolve-session"

/**
 * Kiểm nhanh phiên còn sống — dùng cho giao diện hỏi định kỳ để báo NGAY khi
 * tài khoản bị đăng nhập ở thiết bị khác. Chỉ một truy vấn khi phiên còn hiệu
 * lực, không dựng `TenantContext` như `resolveSession`.
 */
export async function checkSession(request: Request): Promise<void> {
  // Tra phiên theo mã băm — chưa biết tổ chức; cũng được gọi từ Server Component (ngoài `handle()`)
  return asSystemDb("session:check", () => checkSessionUnscoped(request))
}

async function checkSessionUnscoped(request: Request): Promise<void> {
  const token = sessionTokenFrom(request)
  if (!token) throw unauthenticated()

  const sessions = getSessionRepository()
  const session = await sessions.findByTokenHash(hashSessionToken(token))
  if (!session) throw unauthenticated()
  if (isUsable(session, new Date())) return

  if (await sessions.wasSupersededByNewLogin(session)) throw sessionSuperseded()
  throw unauthenticated()
}
