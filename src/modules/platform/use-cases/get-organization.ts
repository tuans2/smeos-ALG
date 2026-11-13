import { notFound } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { getAnyOrganization, type PlatformOrganizationDetail } from "@/modules/platform/infra/platform-query"

/**
 * `GET /platform/organizations/:id` (`N1`, P25a). Không lọc theo tổ chức
 * của người gọi — người vận hành không có "tổ chức của mình". Xem đặc tả
 * 06 mục 21.
 */
export async function getOrganization(
  pctx: PlatformContext,
  organizationId: string
): Promise<PlatformOrganizationDetail> {
  requirePlatformCapability(pctx, "N1")
  const organization = await getAnyOrganization(pctx, organizationId)
  if (!organization) throw notFound()
  return organization
}
