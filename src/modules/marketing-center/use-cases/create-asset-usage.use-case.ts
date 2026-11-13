/**
 * Use-case: Tạo Nơi dùng tư liệu (Asset Usage).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.4).
 * Quyền: M2 (marketing.usage.manage).
 * Kiểm tra hợp lệ:
 * - CTA phải phù hợp với nơi dùng (UsageDestination);
 * - Nơi dùng phải được loại tư liệu (Asset Type) hỗ trợ;
 * - Nếu nơi dùng là kênh cần link/QR (WEB_LINK, QR_CODE), gọi tạo short_link để gắn UTM và đo lượt quét.
 */

import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { isLibraryType } from "@/modules/storage/domain/library"
import { createShortLink } from "@/modules/acquisition/use-cases/manage-short-links"
import type { UsageDestination } from "../domain/asset-type"
import type { AssetUsage } from "../domain/asset-usage"
import type { CtaCode } from "../domain/cta-registry"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import type { ICampaignRepository } from "../domain/repositories/campaign-repository.interface"
import { isCtaAllowedForDestination, isDestinationAllowedForAsset } from "../domain/usage-rules"
import { getAssetUsageRepository } from "../infra/asset-usage-repository"
import { getCampaignRepository } from "../infra/campaign-repository"

export interface CreateAssetUsageInput {
  sourceType: string
  sourceId: string
  assetTypeCode: string
  destination: UsageDestination
  ctaCode: CtaCode
  title: string
  channelId?: string | undefined
  targetPath?: string | undefined
  campaignId?: string | null | undefined
  config?: Record<string, unknown> | undefined
}

export interface CreateAssetUsageResult {
  usage: AssetUsage
  shortLink?: {
    id: string
    code: string
    targetPath: string
  } | undefined
}

export async function createAssetUsageUseCase(
  ctx: TenantContext,
  input: CreateAssetUsageInput,
  deps: {
    repo?: IAssetUsageRepository
    campaigns?: Pick<ICampaignRepository, "findById">
    createLink?: typeof createShortLink
  } = {}
): Promise<CreateAssetUsageResult> {
  requireCapability(ctx, "M2")

  const repo = deps.repo ?? getAssetUsageRepository()
  const linkCreator = deps.createLink ?? createShortLink

  if (!isLibraryType(input.sourceType)) {
    throw validationFailed({ sourceType: "Nguồn tư liệu không hợp lệ" })
  }

  if (!input.title || input.title.trim().length === 0) {
    throw validationFailed({ title: "Tên nơi dùng không được để trống" })
  }

  // 1. Kiểm tra CTA hợp lệ theo Nơi dùng
  if (!isCtaAllowedForDestination(input.ctaCode, input.destination)) {
    throw validationFailed({
      ctaCode: `Mã CTA "${input.ctaCode}" không hợp lệ cho nơi dùng "${input.destination}"`,
    })
  }

  // 2. Kiểm tra Nơi dùng có được phép theo Loại asset
  if (!isDestinationAllowedForAsset(input.assetTypeCode, input.destination)) {
    throw validationFailed({
      destination: `Nơi dùng "${input.destination}" không áp dụng cho loại tư liệu #${input.assetTypeCode}`,
    })
  }

  // Chiến dịch nhận từ body phải thuộc tổ chức đang thao tác — không thì 404.
  if (input.campaignId) {
    const campaigns = deps.campaigns ?? getCampaignRepository()
    if (!(await campaigns.findById(ctx, input.campaignId))) {
      throw notFound()
    }
  }

  let shortLinkId: string | null = null
  let createdShortLink: { id: string; code: string; targetPath: string } | undefined

  // 3. Nếu là kênh link hoặc QR, tạo short link liên kết
  const needsLink = input.channelId === "WEB_LINK" || input.channelId === "QR_CODE" || Boolean(input.targetPath)
  if (needsLink && input.targetPath) {
    const kind = input.channelId === "QR_CODE" ? "QR" : "SALES_LINK"
    const sl = await linkCreator(ctx, kind, {
      name: input.title.trim(),
      targetPath: input.targetPath,
      placementLabel: input.destination,
      utmSource: "alg_asset_usage",
      utmMedium: kind.toLowerCase(),
      utmCampaign: `usage_${input.assetTypeCode}`,
    })
    shortLinkId = sl.id
    createdShortLink = {
      id: sl.id,
      code: sl.code,
      targetPath: sl.target_path,
    }
  }

  const usage = await repo.create(ctx, {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    assetTypeCode: input.assetTypeCode,
    destination: input.destination,
    ctaCode: input.ctaCode,
    title: input.title.trim(),
    shortLinkId,
    campaignId: input.campaignId ?? null,
    config: input.config ?? {},
    status: "ACTIVE",
    createdBy: ctx.userId,
  })

  return {
    usage,
    shortLink: createdShortLink,
  }
}

