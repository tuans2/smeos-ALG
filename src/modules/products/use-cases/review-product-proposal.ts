import { notFound, unprocessable } from "@/core/http/errors"
import { runInBackground } from "@/core/runtime/background"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { approveProposal, PROPOSAL_KEY, readProposal, rejectProposal } from "@/modules/products/domain/product-proposal"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { notifyProposer } from "./product-proposal-notifications"

async function loadPending(ctx: TenantContext, repo: ProductRepository, id: string) {
  const current = await repo.findById(ctx, id)
  if (!current) throw notFound()
  const attrs = (current.attributes as Record<string, unknown> | null) ?? {}
  const proposal = readProposal(attrs)
  if (proposal?.status !== "pending") throw unprocessable("Mẫu này không có đề xuất nào đang chờ duyệt")
  return { current, attrs, proposal }
}

/**
 * Điều hành duyệt mẫu đề xuất (`H3`, kiểm ở route): giữ lịch sử người đề xuất,
 * đánh dấu đã duyệt, ghi `audit_logs`. Mẫu tổ chức khác → 404.
 */
export async function approveProductProposal(ctx: TenantContext, id: string) {
  const repo = new ProductRepository()
  const { attrs, proposal } = await loadPending(ctx, repo, id)

  const approved = approveProposal(proposal, ctx.userId)
  const updated = await repo.update(ctx, id, { attributes: { ...attrs, [PROPOSAL_KEY]: approved } })
  if (!updated) throw notFound()

  await recordAuditLog(ctx, { action: "product.approve", entityType: "product", entityId: id, before: { proposal }, after: { proposal: approved } })
  return updated
}

/**
 * Điều hành từ chối mẫu đề xuất (`H3`): mẫu tạm ẩn (`DRAFT`) ngay để không bán
 * tiếp, lưu lý do, báo người đề xuất. 30 ngày sau tác vụ quét chuyển vào thùng rác.
 */
export async function rejectProductProposal(ctx: TenantContext, id: string, reason: string) {
  const repo = new ProductRepository()
  const { current, attrs, proposal } = await loadPending(ctx, repo, id)

  const rejected = rejectProposal(proposal, ctx.userId, reason)
  const updated = await repo.update(ctx, id, { status: "DRAFT", attributes: { ...attrs, [PROPOSAL_KEY]: rejected } })
  if (!updated) throw notFound()

  await recordAuditLog(ctx, {
    action: "product.proposal.reject",
    entityType: "product",
    entityId: id,
    before: { status: current.status, proposal },
    after: { status: "DRAFT", proposal: rejected },
  })
  runInBackground("products.notify_rejected", () =>
    notifyProposer(ctx.organizationId, "PRODUCT_PROPOSAL_REJECTED", proposal.byUserId, current, reason)
  )
  return updated
}
