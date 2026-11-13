import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { listAuditAcrossOrganizations, type PlatformAuditRow } from "@/modules/platform/infra/platform-query"

/** `GET /platform/audit-logs` (`N6`, P25a). Xem đặc tả 06 mục 21. */
export async function listPlatformAudit(pctx: PlatformContext, limit = 100): Promise<PlatformAuditRow[]> {
  requirePlatformCapability(pctx, "N6")
  return listAuditAcrossOrganizations(pctx, limit)
}
