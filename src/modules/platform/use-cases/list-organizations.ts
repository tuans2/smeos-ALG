import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { listAllOrganizations, type PlatformOrganizationSummary } from "@/modules/platform/infra/platform-query"

/** `GET /platform/organizations` (`N1`, P25a). Xem đặc tả 06 mục 21. */
export async function listOrganizations(pctx: PlatformContext): Promise<PlatformOrganizationSummary[]> {
  requirePlatformCapability(pctx, "N1")
  return listAllOrganizations(pctx)
}
