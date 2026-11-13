import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { getCustomDomainRepository, type CustomDomainRepository } from "../infra/custom-domain-repository"
import { invalidateCustomDomainCache } from "./resolve-custom-domain"
import { toView, type CustomDomainView } from "./manage-custom-domains"

/**
 * Console nền tảng → tên miền riêng của một tổ chức (checklist ALG 10.8). Xem: `N1`. Khoá / mở lại: `N20`.
 * Khoá → ngừng phục vụ ngay (proxy trả 404), cửa hàng không tự gỡ được. Mở lại → về "Chờ xác minh",
 * cửa hàng kiểm lại bản ghi TXT trước khi tên miền chạy lại.
 */

export async function listOrganizationCustomDomains(
  pctx: PlatformContext, organizationId: string, repo: CustomDomainRepository = getCustomDomainRepository(),
): Promise<CustomDomainView[]> {
  requirePlatformCapability(pctx, "N1")
  if (!(await repo.organizationExists(organizationId))) throw notFound()
  return (await repo.listForOrganization(organizationId)).map((r) => toView(r))
}

export const LOCK_REASON_MIN = 5
export const LOCK_REASON_MAX = 300

export async function setCustomDomainLock(
  pctx: PlatformContext, id: string, input: { locked: boolean; reason?: string | undefined },
  repo: CustomDomainRepository = getCustomDomainRepository(),
): Promise<CustomDomainView> {
  requirePlatformCapability(pctx, "N20")
  const row = await repo.findById(id)
  if (!row) throw notFound()
  const reason = (input.reason ?? "").trim()
  if (input.locked) {
    if (reason.length < LOCK_REASON_MIN || reason.length > LOCK_REASON_MAX) {
      throw validationFailed({ reason: `Ghi lý do khoá từ ${LOCK_REASON_MIN} đến ${LOCK_REASON_MAX} ký tự.` })
    }
    if (row.status === "LOCKED") throw conflict("Tên miền đã bị khoá.")
  } else if (row.status !== "LOCKED") {
    throw conflict("Tên miền không ở trạng thái khoá.")
  }
  const updated = await repo.update(row.organization_id, id, input.locked
    ? { status: "LOCKED", locked_reason: reason }
    : { status: "PENDING", locked_reason: null, verified_at: null })
  if (!updated) throw notFound()
  invalidateCustomDomainCache(row.hostname)
  await recordPlatformAuditLog(pctx, {
    action: input.locked ? "platform.custom_domain.lock" : "platform.custom_domain.unlock",
    entityType: "custom_domains", entityId: id,
    before: { hostname: row.hostname, status: row.status, organizationId: row.organization_id },
    after: { status: updated.status, ...(input.locked ? { reason } : {}) },
  })
  return toView(updated)
}
