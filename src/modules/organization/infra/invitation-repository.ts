import { prisma } from "@/core/tenancy/infra/prisma"
import type { DbClient } from "./db-client"

export interface PendingInvitationRow {
  membershipId: string
  organizationId: string
  organizationName: string
  roleName: string
  invitedAt: Date
}

/**
 * Lời mời của CHÍNH người đang đăng nhập (lọc theo `user_id` của phiên, không theo tổ chức đang hoạt động —
 * lời mời thuộc tổ chức KHÁC). Mọi lệnh ghi có điều kiện `user_id` + `status = INVITED`: người khác không nhận
 * hộ được, nhận hai lần không ghi hai lần.
 */
export class InvitationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async listPendingForUser(userId: string): Promise<PendingInvitationRow[]> {
    const rows = await this.db.memberships.findMany({
      where: { user_id: userId, status: "INVITED" },
      orderBy: { invited_at: "desc" },
      select: {
        id: true,
        organization_id: true,
        invited_at: true,
        organization: { select: { name: true } },
        fk_role: { select: { name: true } },
      },
    })
    return rows.map((r) => ({
      membershipId: r.id,
      organizationId: r.organization_id,
      organizationName: r.organization.name,
      roleName: r.fk_role.name,
      invitedAt: r.invited_at,
    }))
  }

  findPending(userId: string, membershipId: string) {
    return this.db.memberships.findFirst({
      where: { id: membershipId, user_id: userId, status: "INVITED" },
      select: { id: true, organization_id: true, invited_at: true },
    })
  }

  async accept(userId: string, membershipId: string, now: Date): Promise<boolean> {
    const res = await this.db.memberships.updateMany({
      where: { id: membershipId, user_id: userId, status: "INVITED" },
      data: { status: "ACTIVE", joined_at: now },
    })
    return res.count > 0
  }

  async decline(userId: string, membershipId: string): Promise<boolean> {
    const res = await this.db.memberships.deleteMany({ where: { id: membershipId, user_id: userId, status: "INVITED" } })
    return res.count > 0
  }
}
