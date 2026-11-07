import { AppError, conflict, notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import type { PartnershipStatus } from "../domain/partnership-entities"
import {
  checkPartnershipTransition,
  isPartnershipInviteExpired,
  PARTNERSHIP_STATUS_LABELS,
  type PartnershipActor,
} from "../domain/partnership-lifecycle"
import { ChainInvitationRepository, type StoreSideLink } from "../infra/chain-invitation-repository"
import { getChainPartnershipRepository } from "../infra/prisma-partnership-repository"

/**
 * Hai phía của liên kết Chuỗi ↔ cửa hàng (audit hành trình C1/C2, gói UJ-10 — UQ2).
 * Cửa hàng: xem lời mời và chuỗi đang tham gia, đồng ý / từ chối, tự rời chuỗi.
 * Chuỗi: tạm ngưng / mở lại / chấm dứt / rút lời mời — bắt buộc lý do, ghi nhật ký, báo bên kia.
 */
export interface ChainLinksDeps {
  repo: Pick<ChainInvitationRepository, "listForStore" | "findForStore" | "transition">
  notify: typeof notifyOrganization
  audit: typeof recordAuditLog
  now: () => Date
}

const defaults = (): ChainLinksDeps => ({ repo: new ChainInvitationRepository(), notify: notifyOrganization, audit: recordAuditLog, now: () => new Date() })

export interface StoreChainLinks {
  invitations: StoreSideLink[]
  memberships: StoreSideLink[]
}

export async function listStoreChainLinks(ctx: TenantContext, deps: ChainLinksDeps = defaults()): Promise<StoreChainLinks> {
  const rows = await deps.repo.listForStore(ctx.organizationId, ["PENDING", "ACTIVE", "SUSPENDED"])
  const now = deps.now()
  return {
    invitations: rows.filter((r) => r.status === "PENDING" && !isPartnershipInviteExpired(r.validFrom, now)),
    memberships: rows.filter((r) => r.status !== "PENDING"),
  }
}

const RESPONSE_TEXT: Partial<Record<PartnershipStatus, string>> = {
  ACTIVE: "đã đồng ý liên kết",
  TERMINATED: "đã từ chối / rời liên kết",
}

/** Cửa hàng đồng ý (`ACTIVE`), từ chối lời mời hoặc rời chuỗi (`TERMINATED`). */
export async function respondToChainLink(
  ctx: TenantContext,
  linkId: string,
  to: "ACTIVE" | "TERMINATED",
  reason: string | null,
  deps: ChainLinksDeps = defaults(),
): Promise<StoreSideLink> {
  const link = await deps.repo.findForStore(ctx.organizationId, linkId)
  if (!link) throw notFound()
  const now = deps.now()
  if (link.status === "PENDING" && to === "ACTIVE" && isPartnershipInviteExpired(link.validFrom, now)) {
    throw conflict("Lời mời đã hết hạn — nhờ chuỗi gửi lời mời mới.")
  }
  ensure(link.status, to, "STORE")
  if (link.status !== "PENDING" && !reason?.trim()) throw validationFailed({ reason: "Nêu lý do rời chuỗi" })
  if (!(await deps.repo.transition(ctx.organizationId, linkId, link.status, to, now))) {
    throw conflict("Liên kết vừa được thay đổi — tải lại để xem trạng thái mới.")
  }
  await deps.audit(ctx, {
    action: "chain_link.store_respond",
    entityType: "organization_links",
    entityId: linkId,
    before: { status: link.status },
    after: { status: to, reason: reason?.trim() || null },
  })
  void deps.notify({
    organizationId: link.chainOrgId,
    eventKey: "CHAIN_PARTNER_RESPONDED",
    message: `Cửa hàng mã ${link.partnerCode} ${RESPONSE_TEXT[to] ?? "đã cập nhật liên kết"}${reason?.trim() ? `: ${reason.trim()}` : ""}.`,
    deepLink: "/dieu-phoi/doi-tac",
  })
  return { ...link, status: to }
}

/** Chuỗi đổi trạng thái liên kết của mình (thay `PATCH /coordinator/partners/:id/status` trần trụi). */
export async function changePartnershipStatus(
  ctx: TenantContext,
  partnershipId: string,
  to: PartnershipStatus,
  reason: string,
  deps: Pick<ChainLinksDeps, "notify" | "audit"> & { partnerships?: ReturnType<typeof getChainPartnershipRepository> } = {
    notify: notifyOrganization,
    audit: recordAuditLog,
  },
) {
  const repo = deps.partnerships ?? getChainPartnershipRepository()
  const partnership = await repo.findPartnershipById(partnershipId)
  // Chuỗi khác → 404, không lộ id tồn tại
  if (!partnership || partnership.chainOrgId !== ctx.organizationId) throw notFound()
  if (!reason.trim()) throw validationFailed({ reason: "Nêu lý do đổi trạng thái liên kết" })
  ensure(partnership.status, to, "CHAIN")
  const updated = await repo.updateStatus(partnershipId, to)
  await deps.audit(ctx, {
    action: "chain_link.chain_status",
    entityType: "organization_links",
    entityId: partnershipId,
    before: { status: partnership.status },
    after: { status: to, reason: reason.trim() },
  })
  void deps.notify({
    organizationId: partnership.partnerOrgId,
    eventKey: "CHAIN_LINK_STATUS_CHANGED",
    message: `Chuỗi đã chuyển liên kết sang "${PARTNERSHIP_STATUS_LABELS[to]}": ${reason.trim()}.`,
    deepLink: "/cai-dat",
  })
  return updated
}

function ensure(from: PartnershipStatus, to: PartnershipStatus, actor: PartnershipActor): void {
  const check = checkPartnershipTransition(from, to, actor)
  if (!check.ok) throw new AppError("CONFLICT", check.reason)
}
