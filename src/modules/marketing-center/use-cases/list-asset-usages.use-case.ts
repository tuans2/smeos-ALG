/**
 * Use-case: Đọc danh sách Nơi dùng tư liệu (Asset Usages).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.4).
 * Quyền: M1 (marketing.usage.read).
 */

import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { UsageDestination } from "../domain/asset-type"
import type { AssetUsage, AssetUsageStatus } from "../domain/asset-usage"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import { getAssetUsageRepository } from "../infra/asset-usage-repository"

export interface ListAssetUsagesFilter {
  sourceType?: string | undefined
  sourceId?: string | undefined
  destination?: UsageDestination | undefined
  status?: AssetUsageStatus | undefined
  take?: number | undefined
  skip?: number | undefined
}

export async function listAssetUsagesUseCase(
  ctx: TenantContext,
  filter: ListAssetUsagesFilter = {},
  deps: { repo?: IAssetUsageRepository } = {}
): Promise<readonly AssetUsage[]> {
  requireCapability(ctx, "M1")
  const repo = deps.repo ?? getAssetUsageRepository()

  if (filter.sourceType && filter.sourceId) {
    return repo.listBySource(ctx, filter.sourceType, filter.sourceId)
  }

  return repo.list(ctx, {
    destination: filter.destination,
    status: filter.status,
    take: filter.take,
    skip: filter.skip,
  })
}

