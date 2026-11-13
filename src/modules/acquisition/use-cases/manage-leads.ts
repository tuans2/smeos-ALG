import type { TenantContext } from "@/core/tenancy/tenant-context"
import { notFound, validationFailed } from "@/core/http/errors"
import { recordAuditLog, type RecordAuditLogInput } from "@/modules/audit/use-cases/record-audit-log"
import {
  canTransitionLeadStatus,
  isLeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  type LeadStatus,
} from "../domain/lead-rules"
import { LeadRepository } from "../infra/lead-repository"

export async function listLeads(
  ctx: TenantContext,
  opts: { status?: string | undefined; limit: number; cursor?: string | undefined },
  repo = new LeadRepository(),
) {
  let filterStatus: LeadStatus | LeadStatus[] | undefined
  if (opts.status !== undefined) {
    const raw = opts.status.split(",").map((s) => s.trim()).filter(Boolean)
    const parsed: LeadStatus[] = []
    for (const s of raw) {
      const normalized = s === "IN_PROGRESS" ? "CONTACTED" : s
      if (!isLeadStatus(normalized)) {
        throw validationFailed({ status: `Phải là một trong: ${LEAD_STATUSES.join(", ")}` })
      }
      parsed.push(normalized)
    }
    if (parsed.length === 1) filterStatus = parsed[0]
    else if (parsed.length > 1) filterStatus = parsed
  }
  const [page, counts] = await Promise.all([
    repo.list(ctx, { status: filterStatus, limit: opts.limit, cursor: opts.cursor }),
    repo.countByStatus(ctx),
  ])
  return { ...page, counts }
}

/** Đổi trạng thái chăm sóc và/hoặc người phụ trách. Lead tổ chức khác → 404. */
export async function updateLead(
  ctx: TenantContext,
  id: string,
  patch: { status?: string | undefined; assigneeUserId?: string | null | undefined },
  repo = new LeadRepository(),
  audit: (ctx: TenantContext, input: RecordAuditLogInput) => Promise<unknown> = recordAuditLog,
) {
  let targetStatus: LeadStatus | undefined
  if (patch.status !== undefined) {
    const normalized = patch.status === "IN_PROGRESS" ? "CONTACTED" : patch.status
    if (!isLeadStatus(normalized)) {
      throw validationFailed({ status: `Phải là một trong: ${LEAD_STATUSES.join(", ")}` })
    }
    targetStatus = normalized
  }
  const existing = await repo.findById(ctx, id)
  if (!existing) throw notFound()
  if (targetStatus && !canTransitionLeadStatus(existing.status, targetStatus)) {
    throw validationFailed({
      status: `Không thể chuyển trạng thái từ "${LEAD_STATUS_LABELS[existing.status as LeadStatus] ?? existing.status}" sang "${LEAD_STATUS_LABELS[targetStatus]}"`,
    })
  }
  if (patch.assigneeUserId && !(await repo.isActiveMember(ctx, patch.assigneeUserId))) {
    throw validationFailed({ assigneeUserId: "Người phụ trách phải là thành viên đang hoạt động của cửa hàng" })
  }
  const data: { status?: LeadStatus; assigneeUserId?: string | null } = {}
  if (targetStatus !== undefined) data.status = targetStatus
  if (patch.assigneeUserId !== undefined) data.assigneeUserId = patch.assigneeUserId
  if (!(await repo.update(ctx, id, data))) throw notFound()
  await audit(ctx, {
    action: "lead.update",
    entityType: "lead",
    entityId: id,
    before: { status: existing.status, assigneeUserId: existing.assignee_user_id },
    after: data,
  })
  return repo.findById(ctx, id)
}
