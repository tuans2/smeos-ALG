import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { UsageDestination } from "../asset-type"
import type { AssetUsage, AssetUsageStatus } from "../asset-usage"
import type { CtaCode } from "../cta-registry"

export interface CreateAssetUsageData {
  sourceType: string
  sourceId: string
  assetTypeCode: string
  destination: UsageDestination
  ctaCode: CtaCode
  title: string
  shortLinkId?: string | null | undefined
  campaignId?: string | null | undefined
  config?: Record<string, unknown> | undefined
  status?: AssetUsageStatus | undefined
  createdBy: string
}

export interface UpdateAssetUsageData {
  title?: string | undefined
  ctaCode?: CtaCode | undefined
  destination?: UsageDestination | undefined
  shortLinkId?: string | null | undefined
  campaignId?: string | null | undefined
  config?: Record<string, unknown> | undefined
  status?: AssetUsageStatus | undefined
}

export interface AssetUsageFilter {
  destination?: UsageDestination | undefined
  campaignId?: string | undefined
  status?: AssetUsageStatus | undefined
  take?: number | undefined
  skip?: number | undefined
}

export interface IAssetUsageRepository {
  create(ctx: TenantContext, data: CreateAssetUsageData): Promise<AssetUsage>
  findById(ctx: TenantContext, id: string): Promise<AssetUsage | null>
  listBySource(ctx: TenantContext, sourceType: string, sourceId: string): Promise<readonly AssetUsage[]>
  list(ctx: TenantContext, filter?: AssetUsageFilter): Promise<readonly AssetUsage[]>
  update(ctx: TenantContext, id: string, data: UpdateAssetUsageData): Promise<AssetUsage>
}

