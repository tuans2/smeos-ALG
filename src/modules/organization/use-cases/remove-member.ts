import { notFound, unprocessable } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { StaffAccountRepository, getStaffAccountRepository } from "@/modules/organization/infra/staff-account-repository"

/**
 * `DELETE /members/:id` (`F4`, trần cứng Điều hành — đặc tả 06 mục 4): xoá nhân viên khỏi tiệm, đăng
 * xuất ngay khỏi tiệm này. Không tự xoá chính mình (tránh tiệm mất Điều hành).
 */
export async function removeMember(
  ctx: TenantContext,
  membershipId: string,
  membershipRepo = getMembershipRepository(),
  staffAccountRepo = getStaffAccountRepository()
): Promise<void> {
  const membership = await membershipRepo.findById(ctx, membershipId)
  if (!membership) throw notFound()
  if (membership.user_id === ctx.userId) throw unprocessable("Không thể tự xoá tài khoản của chính bạn")
  const removed = await staffAccountRepo.removeMembership(ctx, membership.id, membership.user_id)
  if (!removed) throw notFound()
  await recordAuditLog(ctx, {
    action: "member.remove",
    entityType: "memberships",
    entityId: membership.id,
    before: { userId: membership.user_id, status: membership.status },
    after: {},
  })
}
