import { AppError, notFound } from "@/core/http/errors"
import { INVITATION_EXPIRED_MESSAGE, isInvitationExpired } from "../domain/invitation-rules"
import { InvitationRepository, type PendingInvitationRow } from "../infra/invitation-repository"

/**
 * Nhận / từ chối lời mời vào tổ chức (audit hành trình M1, gói UJ-14 — PO chọn giữ hai đường: "Thêm nhân viên"
 * cho người mới, "Mời" cho người đã có tài khoản). Mọi thao tác theo `userId` của phiên; lời mời của người khác
 * hay đã hết hạn đều không nhận được.
 */
export async function listMyInvitations(
  userId: string,
  now: Date = new Date(),
  repo: Pick<InvitationRepository, "listPendingForUser"> = new InvitationRepository(),
): Promise<PendingInvitationRow[]> {
  const rows = await repo.listPendingForUser(userId)
  return rows.filter((r) => !isInvitationExpired(r.invitedAt, now))
}

export async function acceptInvitation(
  userId: string,
  membershipId: string,
  now: Date = new Date(),
  repo: Pick<InvitationRepository, "findPending" | "accept"> = new InvitationRepository(),
): Promise<{ organizationId: string }> {
  const pending = await repo.findPending(userId, membershipId)
  if (!pending) throw notFound()
  if (isInvitationExpired(pending.invited_at, now)) throw new AppError("CONFLICT", INVITATION_EXPIRED_MESSAGE)
  if (!(await repo.accept(userId, membershipId, now))) throw notFound()
  return { organizationId: pending.organization_id }
}

export async function declineInvitation(
  userId: string,
  membershipId: string,
  repo: Pick<InvitationRepository, "decline"> = new InvitationRepository(),
): Promise<void> {
  if (!(await repo.decline(userId, membershipId))) throw notFound()
}
