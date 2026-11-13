import { notFound, unprocessable } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import type { memberships } from "@/modules/organization/infra/entities"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"

/**
 * `PATCH /members/:id/role` (`F5`, đặc tả 06 mục 4).
 *
 * Không đổi vai của chính mình (chặn tự nâng/hạ quyền — checklist ALG 1.11, 9.12). Quyền mới có hiệu
 * lực ngay ở yêu cầu kế tiếp vì `tenantContextFor` tính lại năng lực mỗi lần giải phiên. Mỗi lần đổi
 * ghi `audit_logs` với vai trước và sau.
 */
export async function changeMemberRole(
  ctx: TenantContext,
  membershipId: string,
  roleId: string
): Promise<memberships> {
  const repo = getMembershipRepository()
  const current = await repo.findById(ctx, membershipId)
  if (!current) throw notFound()
  if (current.user_id === ctx.userId) throw unprocessable("Không tự đổi vai của chính tài khoản bạn")

  const role = await getRoleRepository().findAssignableById(ctx, roleId)
  if (!role) throw notFound()

  const updated = await repo.updateRole(ctx, membershipId, role.id)
  if (!updated) throw notFound()

  await recordAuditLog(ctx, {
    action: "member.role.change",
    entityType: "memberships",
    entityId: membershipId,
    before: { roleId: current.role_id },
    after: { roleId: role.id, roleKey: role.key },
  })
  return updated
}
