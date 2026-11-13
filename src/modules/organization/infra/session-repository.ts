import type { sessions } from "./entities"

import { prisma } from "@/core/tenancy/infra/prisma"

import type { DbClient } from "./db-client"

/**
 * `sessions` không phải bảng thuộc tenant: nó là con trỏ *tới* một tổ chức,
 * không phải dữ liệu *của* một tổ chức. Cột `organization_id` ở đây là tổ chức
 * đang hoạt động của phiên, và nó là **nguồn duy nhất** của
 * `TenantContext.organizationId` (`YC-T2`).
 *
 * Ghi vào cột đó chỉ xảy ra ở use-case `switch-organization`, sau khi đã đối
 * chiếu `memberships`.
 */
export class SessionRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(input: {
    user_id: string
    token_hash: string
    organization_id: string | null
    expires_at: Date
    created_at?: Date
  }): Promise<sessions> {
    return this.db.sessions.create({ data: input })
  }

  /**
   * Một tài khoản chỉ một phiên: thu hồi mọi phiên còn hiệu lực của người
   * dùng trước khi cấp phiên mới. Gọi cùng transaction với `create`, và dùng
   * cùng mốc `now` làm `created_at` của phiên mới — `isSupersededBy` dựa vào
   * sự trùng mốc đó để phân biệt "bị đăng nhập nơi khác" với "tự đăng xuất".
   */
  async revokeAllActiveForUser(userId: string, now: Date): Promise<number> {
    const result = await this.db.sessions.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: now },
    })
    return result.count
  }

  /** Có phiên mới hơn của cùng người dùng được cấp đúng lúc phiên này bị thu hồi. */
  async wasSupersededByNewLogin(session: sessions): Promise<boolean> {
    if (!session.revoked_at) return false
    const newer = await this.db.sessions.findFirst({
      where: { user_id: session.user_id, created_at: session.revoked_at, id: { not: session.id } },
      select: { id: true },
    })
    return newer !== null
  }

  findByTokenHash(tokenHash: string): Promise<sessions | null> {
    return this.db.sessions.findUnique({ where: { token_hash: tokenHash } })
  }

  async setActiveOrganization(sessionId: string, organizationId: string): Promise<void> {
    await this.db.sessions.update({
      where: { id: sessionId },
      data: { organization_id: organizationId },
    })
  }

  async revoke(sessionId: string, now: Date): Promise<void> {
    await this.db.sessions.update({
      where: { id: sessionId },
      data: { revoked_at: now },
    })
  }
}

let _sessionRepositorySingleton: SessionRepository | null = null
export function getSessionRepository(db?: DbClient): SessionRepository {
  if (db) return new SessionRepository(db)
  if (!_sessionRepositorySingleton) _sessionRepositorySingleton = new SessionRepository()
  return _sessionRepositorySingleton
}
