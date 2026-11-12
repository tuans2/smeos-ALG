import type { TenantContext } from "@/core/tenancy"
import { getBranchRepository } from "@/modules/organization/infra/branch-repository"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"
import { UserRepository, getUserRepository } from "@/modules/organization/infra/user-repository"

export type MemberSummary = {
  id: string
  /** `phone` chỉ có khi người xem quản lý tài khoản nhân viên (A3). */
  user: { id: string; name: string | null; email: string; phone?: string | null }
  role: { id: string; key: string; name: string } | null
  branch_id: string | null
  /** Mã chi nhánh nhận đơn điều phối của tài khoản (suy từ `branch_id`, ADR-012 T-4c; null = chưa gắn) */
  chain_branch_code: string | null
  status: string
  invited_at: string
  joined_at: string | null
}

/** `GET /members` (`F1`, đặc tả 06 mục 4). */
export async function listMembers(ctx: TenantContext): Promise<MemberSummary[]> {
  const [memberships, branches] = await Promise.all([getMembershipRepository().list(ctx), getBranchRepository().list(ctx)])
  const dispatchCodeById = new Map(branches.filter((b) => b.accepts_dispatch).map((b) => [b.id, b.code]))
  const users = getUserRepository()
  const roles = getRoleRepository()
  // Email nhân viên chỉ cho người quản lý nhân viên (tạo, gỡ, phân vai) — Sale/Điều phối xem tên và vai (PO 11/11/2026)
  const managesStaff = ["A3", "F4", "F5"].some((code) => ctx.capabilities.has(code))

  return Promise.all(
    memberships.map(async (membership) => {
      const [user, role] = await Promise.all([
        users.findById(membership.user_id),
        roles.findAssignableById(ctx, membership.role_id),
      ])
      return {
        id: membership.id,
        user: user
          ? { id: user.id, name: user.name, email: managesStaff ? user.email : "", ...(ctx.capabilities.has("A3") ? { phone: user.phone } : {}) }
          : { id: membership.user_id, name: null, email: "" },
        role: role ? { id: role.id, key: role.key, name: role.name } : null,
        branch_id: membership.branch_id,
        chain_branch_code: membership.branch_id ? (dispatchCodeById.get(membership.branch_id) ?? null) : null,
        status: membership.status,
        invited_at: membership.invited_at.toISOString(),
        joined_at: membership.joined_at ? membership.joined_at.toISOString() : null,
      }
    })
  )
}
