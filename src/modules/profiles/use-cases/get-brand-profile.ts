import type { TenantContext } from "@/core/tenancy"
import { getBrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import type { IBrandProfileRepository } from "@/modules/profiles/domain/repositories/brand-profile-repository.interface"
import { getAssetRepository } from "@/modules/assets/infra/asset-repository"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { ASSET_VIEW_URL_TTL_SECONDS } from "@/modules/assets/use-cases/get-asset-view-url"

export type BrandProfileDetail = {
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  background_color: string | null
  text_color: string | null
  font_heading: string | null
  font_body: string | null
  logo_asset_id: string | null
  logo_url: string | null
  tone_of_voice: string | null
  hashtags: Record<string, unknown> | null
  cta_templates: Record<string, unknown> | null
  default_offers: Record<string, unknown> | null
  forbidden_styles: Record<string, unknown> | null
  brand_assets: Record<string, unknown> | null
  slogan: string | null
}

/**
 * `GET /brand-profile` (`F1`, đặc tả 06 mục 5). `null` khi tổ chức chưa nhập
 * hồ sơ thương hiệu — xem chú thích ở `getBusinessProfile`.
 */
export async function getBrandProfile(
  ctx: TenantContext,
  repo: IBrandProfileRepository = getBrandProfileRepository(),
  assetRepo: IAssetRepository = getAssetRepository()
): Promise<BrandProfileDetail | null> {
  const profile = await repo.current(ctx)
  if (!profile) return null

  let logoUrl: string | null = null
  if (profile.logo_asset_id) {
    if (
      profile.logo_asset_id.startsWith("/") ||
      profile.logo_asset_id.startsWith("http://") ||
      profile.logo_asset_id.startsWith("https://")
    ) {
      logoUrl = profile.logo_asset_id
    } else {
      try {
        const asset = await assetRepo.findById(ctx, profile.logo_asset_id)
        if (asset) {
          logoUrl = await getStorageProvider().signedUrl(
            asset.storage_key,
            ASSET_VIEW_URL_TTL_SECONDS,
            "GET"
          )
        }
      } catch {
        // an toàn: không ném lỗi nếu không ký được URL
      }
    }
  }

  return {
    primary_color: profile.primary_color,
    secondary_color: profile.secondary_color,
    accent_color: profile.accent_color,
    background_color: profile.background_color,
    text_color: profile.text_color,
    font_heading: profile.font_heading,
    font_body: profile.font_body,
    logo_asset_id: profile.logo_asset_id,
    logo_url: logoUrl,
    tone_of_voice: profile.tone_of_voice,
    hashtags: (profile.hashtags as Record<string, unknown> | null) ?? null,
    cta_templates: (profile.cta_templates as Record<string, unknown> | null) ?? null,
    default_offers: (profile.default_offers as Record<string, unknown> | null) ?? null,
    forbidden_styles: (profile.forbidden_styles as Record<string, unknown> | null) ?? null,
    brand_assets: (profile.brand_assets as Record<string, unknown> | null) ?? null,
    slogan: profile.slogan ?? null,
  }
}
