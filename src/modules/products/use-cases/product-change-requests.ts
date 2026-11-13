import { conflict, notFound, unprocessable } from "@/core/http/errors"
import { assertNotSelfApproval } from "@/modules/organization/use-cases/assert-not-self-approval"
import { hasCapability } from "@/core/rbac/capabilities"
import { runInBackground } from "@/core/runtime/background"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import {
  changeRequestExpiresAt,
  FIELD_LABEL,
  hasConflict,
  pickChanges,
  selectFields,
  type ChangeableField,
  type ProductChanges,
} from "@/modules/products/domain/product-change-request"
import { PRICING_ONLY_ATTRIBUTE_KEYS } from "@/modules/products/domain/product-lookup"
import { PROPOSAL_KEY, readProposal, stripProposal } from "@/modules/products/domain/product-proposal"
import { ProductGovernanceRepository } from "@/modules/products/infra/product-governance-repository"
import { ProductRepository, type UpdateProductInput } from "@/modules/products/infra/product-repository"
import { notifyChangeRequested, notifyProposer } from "./product-proposal-notifications"
import { saveRevision } from "./product-revisions"

/**
 * Nhân viên (không có `H3`) gửi đề xuất sửa một mẫu CHÍNH THỨC. Bản gốc giữ
 * nguyên; Điều hành nhận thông báo. Người thiếu `L5` không đề xuất được BOM/giá
 * sàn-trần (giữ giá trị đang lưu, như `updateProduct`).
 */
export async function submitChangeRequest(ctx: TenantContext, productId: string, input: ProductChanges) {
  const current = await new ProductRepository().findById(ctx, productId)
  if (!current) throw notFound()
  if (hasCapability(ctx, "H3")) throw unprocessable("Điều hành sửa trực tiếp mẫu, không cần gửi đề xuất")

  const stored = (current.attributes as Record<string, unknown> | null) ?? {}
  const proposal = readProposal(stored)
  if (proposal?.status === "pending" && proposal.byUserId === ctx.userId) throw unprocessable("Đây là mẫu bạn đề xuất — hãy sửa trực tiếp")
  if (proposal?.status === "rejected" || proposal?.status === "expired") throw unprocessable("Mẫu đề xuất đã đóng, không nhận đề xuất sửa")

  let attributes = input.attributes as Record<string, unknown> | null | undefined
  if (attributes) {
    attributes = stripProposal(attributes)
    if (!hasCapability(ctx, "L5")) {
      const kept = Object.fromEntries(PRICING_ONLY_ATTRIBUTE_KEYS.filter((k) => k in stored).map((k) => [k, stored[k]]))
      attributes = { ...Object.fromEntries(Object.entries(attributes ?? {}).filter(([k]) => !(PRICING_ONLY_ATTRIBUTE_KEYS as readonly string[]).includes(k))), ...kept }
    }
    if (PROPOSAL_KEY in stored) attributes = { ...attributes, [PROPOSAL_KEY]: stored[PROPOSAL_KEY] }
  }
  const changes = pickChanges(current, { ...input, ...(attributes !== undefined ? { attributes } : {}) })
  if (Object.keys(changes).length === 0) throw unprocessable("Đề xuất không có thay đổi nào so với mẫu hiện tại")

  const created = await new ProductGovernanceRepository().createChangeRequest(ctx, {
    productId,
    changes,
    baseUpdatedAt: current.updated_at,
    expiresAt: changeRequestExpiresAt(new Date()),
  })
  await recordAuditLog(ctx, { action: "product.change_request.submit", entityType: "product", entityId: productId, after: { changeRequestId: created.id, fields: Object.keys(changes) } })
  notifyChangeRequested(ctx, current)
  return created
}

export async function listChangeRequests(ctx: TenantContext, filter: { productId?: string | undefined; status?: string | undefined }) {
  const rows = await new ProductGovernanceRepository().listChangeRequests(ctx, filter)
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product.name,
    productCode: r.product.code,
    proposedBy: r.proposed_by,
    changes: r.changes,
    fields: Object.keys((r.changes as ProductChanges) ?? {}).map((f) => ({ key: f, label: FIELD_LABEL[f as ChangeableField] ?? f })),
    status: r.status,
    note: r.note,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }))
}

function toUpdateInput(applied: ProductChanges): UpdateProductInput {
  return {
    ...(applied.name !== undefined ? { name: applied.name as string } : {}),
    ...(applied.code !== undefined ? { code: applied.code as string } : {}),
    ...(applied.category !== undefined ? { category: applied.category as string | null } : {}),
    ...(applied.shape !== undefined ? { shape: applied.shape as string | null } : {}),
    ...(applied.facing !== undefined ? { facing: applied.facing as string | null } : {}),
    ...(applied.container !== undefined ? { container: applied.container as string | null } : {}),
    ...(applied.attributes !== undefined ? { attributes: applied.attributes as Record<string, unknown> | null } : {}),
    ...(applied.imageAssetId !== undefined ? { imageAssetId: applied.imageAssetId as string | null } : {}),
  }
}

async function loadPendingRequest(ctx: TenantContext, id: string) {
  const request = await new ProductGovernanceRepository().findChangeRequest(ctx, id)
  if (!request) throw notFound()
  if (request.status !== "PENDING") throw unprocessable("Đề xuất này đã được xử lý")
  const product = await new ProductRepository().findById(ctx, request.product_id)
  if (!product) throw notFound()
  return { request, product }
}

/**
 * Điều hành duyệt đề xuất sửa (`H3`) — toàn bộ, hoặc chỉ các trường `fields`.
 * Bản gốc đã đổi sau lúc gửi → 409, không tự gộp. Lưu phiên bản trước khi ghi.
 */
export async function approveChangeRequest(ctx: TenantContext, id: string, fields?: string[] | null) {
  const { request, product } = await loadPendingRequest(ctx, id)
  await assertNotSelfApproval(ctx, request.proposed_by)
  if (hasConflict(request.base_updated_at, product.updated_at)) {
    throw conflict("Mẫu đã được sửa sau khi nhân viên gửi đề xuất. Hãy từ chối và nhờ gửi lại trên bản mới nhất")
  }
  const { applied, partial } = selectFields((request.changes as ProductChanges) ?? {}, fields)
  if (Object.keys(applied).length === 0) throw unprocessable("Chọn ít nhất một thay đổi để áp dụng")

  if (applied.code !== undefined) {
    const existing = await new ProductRepository().findByCode(ctx, applied.code as string)
    if (existing && existing.id !== product.id) throw conflict(`Mã sản phẩm "${applied.code as string}" đã tồn tại trong tổ chức`)
  }
  // Đóng trước khi ghi: hai Điều hành bấm duyệt cùng lúc thì chỉ một người áp dụng.
  const governance = new ProductGovernanceRepository()
  if (!(await governance.closeChangeRequest(ctx, id, { status: partial ? "PARTIAL" : "APPROVED", appliedFields: Object.keys(applied) }))) {
    throw unprocessable("Đề xuất này đã được xử lý")
  }
  await saveRevision(ctx, product, "CHANGE_REQUEST")
  const updated = await new ProductRepository().update(ctx, product.id, toUpdateInput(applied))
  if (!updated) throw notFound()

  await recordAuditLog(ctx, { action: "product.change_request.approve", entityType: "product", entityId: product.id, before: { changeRequestId: id }, after: { fields: Object.keys(applied), partial } })
  runInBackground("products.notify_change_reviewed", () =>
    notifyProposer(ctx.organizationId, "PRODUCT_CHANGE_REVIEWED", request.proposed_by, product, partial ? "Duyệt một phần" : "Đã duyệt")
  )
  return updated
}

export async function rejectChangeRequest(ctx: TenantContext, id: string, reason: string) {
  const { request, product } = await loadPendingRequest(ctx, id)
  if (!(await new ProductGovernanceRepository().closeChangeRequest(ctx, id, { status: "REJECTED", note: reason }))) {
    throw unprocessable("Đề xuất này đã được xử lý")
  }
  await recordAuditLog(ctx, { action: "product.change_request.reject", entityType: "product", entityId: product.id, after: { changeRequestId: id, reason } })
  runInBackground("products.notify_change_reviewed", () =>
    notifyProposer(ctx.organizationId, "PRODUCT_CHANGE_REVIEWED", request.proposed_by, product, `Từ chối: ${reason}`)
  )
  return { id, status: "REJECTED" as const }
}
