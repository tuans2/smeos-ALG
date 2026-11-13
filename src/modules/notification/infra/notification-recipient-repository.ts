/**
 * Thành viên đang hoạt động của một tổ chức kèm vai — nguồn người nhận cho `notifyOrganization`.
 *
 * @module notification/infra
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { findPrimaryChainLink } from "@/modules/organization/infra/tier-chain-repository"
import type { OrgMember } from "../domain/notification-recipients"

export async function listActiveOrgMembers(
  organizationId: string,
  limit: number
): Promise<{ organizationType: string | null; parentChainOrgId?: string | null | undefined; members: OrgMember[] }> {
  const [org, link, rows] = await Promise.all([
    prisma.organizations.findUnique({ where: { id: organizationId }, select: { type: true } }),
    findPrimaryChainLink(organizationId),
    prisma.memberships.findMany({
      where: { organization_id: organizationId, status: "ACTIVE" },
      select: { user_id: true, role_id: true, user: { select: { email: true, phone: true } } },
      orderBy: { joined_at: "asc" },
      take: limit,
    }),
  ])
  const roleIds = [...new Set(rows.map((r) => r.role_id))]
  const roles = roleIds.length
    ? await prisma.roles.findMany({ where: { id: { in: roleIds } }, select: { id: true, key: true } })
    : []
  const keyOf = new Map(roles.map((r) => [r.id, r.key]))
  return {
    organizationType: org?.type ?? null,
    // Chuỗi cha chính (ADR-012 T-1) — để khoá cứng của chuỗi áp xuống cửa hàng đối tác (P2-A11)
    parentChainOrgId: link?.chainOrgId ?? null,
    members: rows.flatMap((r) => {
      const key = keyOf.get(r.role_id)
      return key ? [{ userId: r.user_id, systemRoleKey: key, email: r.user.email, phone: r.user.phone ?? undefined }] : []
    }),
  }
}
