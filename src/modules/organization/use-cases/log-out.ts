import { SessionRepository, getSessionRepository } from "@/modules/organization/infra/session-repository"
import { hashSessionToken } from "@/modules/organization/infra/session-token"

/**
 * Thu hồi phiên. Không có token, hoặc token không khớp phiên nào, cũng coi như
 * xong — đăng xuất không phải chỗ để dò xem token nào còn sống.
 */
export async function logOut(token: string | null): Promise<void> {
  if (!token) return

  const sessions = getSessionRepository()
  const session = await sessions.findByTokenHash(hashSessionToken(token))
  if (!session || session.revoked_at) return

  await sessions.revoke(session.id, new Date())
}
