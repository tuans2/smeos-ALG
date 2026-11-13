import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { summarizeUsageAcrossOrganizations, type PlatformUsageRow } from "@/modules/platform/infra/platform-query"

/** `GET /platform/usage` (`N4`, P25a). Xem đặc tả 06 mục 21. */
export async function summarizeUsage(
  pctx: PlatformContext,
  input: { since?: Date } = {}
): Promise<PlatformUsageRow[]> {
  requirePlatformCapability(pctx, "N4")
  return summarizeUsageAcrossOrganizations(pctx, input)
}
