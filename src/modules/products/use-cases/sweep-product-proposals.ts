import { log } from "@/core/observability/log"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { expireProposal, markReminded, planSweep, PROPOSAL_KEY, readProposal } from "@/modules/products/domain/product-proposal"
import { ProductProposalSweepQuery, type ProposalSweepRow } from "@/modules/products/infra/product-proposal-sweep-query"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { ProductGovernanceRepository } from "@/modules/products/infra/product-governance-repository"
import { TrashRepository } from "@/modules/storage/infra/trash-repository"
import { notifyProposalReminder, notifyProposer } from "./product-proposal-notifications"

const PAGE_SIZE = 100
/** Trần số trang một lượt (100 × 50 = 5.000 mẫu) — vòng lặp luôn có giới hạn. */
const MAX_PAGES = 50
/** Quét đề xuất theo ngày nên một giờ một lần mỗi tiến trình là đủ; quét lặp vẫn an toàn (idempotent). */
const MIN_INTERVAL_MS = 60 * 60 * 1000
const SYSTEM_USER = "system:product-proposal-sweep"

let lastRunMs = 0

export type ProposalSweepSummary = { reminded: number; expired: number; purged: number; changeRequestsExpired: number; errors: number }

/** Ngữ cảnh hệ thống cho đúng tổ chức của dòng đang xử lý (không mang năng lực nào). */
function systemCtx(organizationId: string): TenantContext {
  return { organizationId, workspaceId: organizationId, userId: SYSTEM_USER, branchId: null, capabilities: new Set() }
}

type StepResult = "reminded" | "expired" | "purged"

async function applyStep(row: ProposalSweepRow, now: Date, repo: ProductRepository): Promise<StepResult | null> {
  const attrs = (row.attributes as Record<string, unknown> | null) ?? {}
  const proposal = readProposal(attrs)
  if (!proposal) return null
  const step = planSweep(proposal, now)
  if (!step) return null
  const ctx = systemCtx(row.organization_id)

  if (step.kind === "remind") {
    await repo.update(ctx, row.id, { attributes: { ...attrs, [PROPOSAL_KEY]: markReminded(proposal, step.day) } })
    await notifyProposalReminder(row.organization_id, row, step.daysLeft)
    return "reminded"
  }
  if (step.kind === "expire") {
    const expired = expireProposal(proposal, now)
    await repo.update(ctx, row.id, { status: "DRAFT", attributes: { ...attrs, [PROPOSAL_KEY]: expired } })
    await recordAuditLog(ctx, { action: "product.proposal.expire", entityType: "product", entityId: row.id, before: { status: row.status, proposal }, after: { status: "DRAFT", proposal: expired } })
    await notifyProposer(row.organization_id, "PRODUCT_PROPOSAL_EXPIRED", proposal.byUserId, row)
    return "expired"
  }
  // Điều hành đã mở bán lại mẫu bị từ chối / hết hạn → đang phục vụ khách, không dọn.
  if (row.status !== "DRAFT") return null
  // Ghi thẳng qua kho thùng rác: tác vụ hệ thống, không có người dùng để kiểm quyền.
  if (!(await new TrashRepository().moveToTrash(ctx, { id: row.id, type: "PRODUCT", userId: SYSTEM_USER }))) return null
  await recordAuditLog(ctx, { action: "product.proposal.purge", entityType: "product", entityId: row.id, before: { proposal }, after: { trashed: true } })
  return "purged"
}

/**
 * Tác vụ quét mẫu đề xuất: nhắc Điều hành (ngày 7/21/27), hết hạn sau 30 ngày
 * (tạm ẩn + báo người đề xuất), chuyển mẫu bị từ chối / hết hạn quá 30 ngày vào
 * thùng rác. Lỗi một dòng không dừng cả lượt.
 */
export async function sweepProductProposals(now: Date = new Date(), query = new ProductProposalSweepQuery(), repo = new ProductRepository()): Promise<ProposalSweepSummary> {
  const summary: ProposalSweepSummary = { reminded: 0, expired: 0, purged: 0, changeRequestsExpired: 0, errors: 0 }
  let afterId: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await query.listPage(PAGE_SIZE, afterId)
    if (rows.length === 0) break
    afterId = rows[rows.length - 1]!.id
    for (const row of rows) {
      try {
        const done = await applyStep(row, now, repo)
        if (done) summary[done] += 1
      } catch (error) {
        summary.errors += 1
        log.warn("product_proposal_sweep.row_failed", { productId: row.id, message: error instanceof Error ? error.message : String(error) })
      }
    }
    if (rows.length < PAGE_SIZE) break
  }
  await expireChangeRequests(now, summary)
  return summary
}

/** Đề xuất sửa quá 30 ngày chưa duyệt → đóng `EXPIRED`, báo người đề xuất. Bản gốc không đổi. */
async function expireChangeRequests(now: Date, summary: ProposalSweepSummary) {
  const governance = new ProductGovernanceRepository()
  const products = new ProductRepository()
  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await governance.listExpiredChangeRequests(now, PAGE_SIZE)
    if (rows.length === 0) return
    for (const row of rows) {
      const ctx = systemCtx(row.organization_id)
      try {
        if (!(await governance.closeChangeRequest(ctx, row.id, { status: "EXPIRED" }))) continue
        summary.changeRequestsExpired += 1
        const product = await products.findById(ctx, row.product_id)
        if (product) await notifyProposer(row.organization_id, "PRODUCT_CHANGE_REVIEWED", row.proposed_by, product, "Hết hạn 30 ngày chưa được duyệt")
      } catch (error) {
        summary.errors += 1
        log.warn("product_proposal_sweep.change_request_failed", { changeRequestId: row.id, message: error instanceof Error ? error.message : String(error) })
      }
    }
    if (rows.length < PAGE_SIZE) return
  }
}

/** Gọi từ cron 5 phút: chỉ chạy khi đã qua `MIN_INTERVAL_MS` kể từ lượt trước của tiến trình này. */
export async function sweepProductProposalsIfDue(now: Date = new Date()): Promise<ProposalSweepSummary | null> {
  if (now.getTime() - lastRunMs < MIN_INTERVAL_MS) return null
  lastRunMs = now.getTime()
  try {
    return await sweepProductProposals(now)
  } catch (error) {
    log.error("product_proposal_sweep.failed", { message: error instanceof Error ? error.message : String(error) })
    return null
  }
}
