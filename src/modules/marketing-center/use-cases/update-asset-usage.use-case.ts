/**
 * Use-case: Cập nhật hoặc tạm dừng/kích hoạt lại Nơi dùng tư liệu.
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.4).
 * Quyền: M2 (marketing.usage.manage).
 */

import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { UsageDestination } from "../domain/asset-type"
import type { AssetUsage, AssetUsageStatus } from "../domain/asset-usage"
import type { CtaCode } from "../domain/cta-registry"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import { isCtaAllowedForDestination } from "../domain/usage-rules"
import { getAssetUsageRepository } from "../infra/asset-usage-repository"

export interface UpdateAssetUsageInput {
  id: string
  title?: string | undefined
  ctaCode?: CtaCode | undefined
  destination?: UsageDestination | undefined
  status?: AssetUsageStatus | undefined
  config?: Record<string, unknown> | undefined
}

export async function updateAssetUsageUseCase(
  ctx: TenantContext,
  input: UpdateAssetUsageInput,
  deps: { repo?: IAssetUsageRepository } = {}
): Promise<AssetUsage> {
  requireCapability(ctx, "M2")
  const repo = deps.repo ?? getAssetUsageRepository()

  const existing = await repo.findById(ctx, input.id)
  if (!existing) {
    throw notFound()
  }

  const destination = input.destination ?? existing.destination
  const ctaCode = input.ctaCode ?? existing.ctaCode

  if (input.ctaCode || input.destination) {
    if (!isCtaAllowedForDestination(ctaCode, destination)) {
      throw validationFailed({
        ctaCode: `Mã CTA "${ctaCode}" không hợp lệ cho nơi dùng "${destination}"`,
      })
    }
  }

  return repo.update(ctx, input.id, {
    title: input.title?.trim(),
    ctaCode: input.ctaCode,
    destination: input.destination,
    status: input.status,
    config: input.config,
  })
}

