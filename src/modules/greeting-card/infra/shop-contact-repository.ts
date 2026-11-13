import { prisma } from "@/core/tenancy/infra/prisma"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { zaloQrUrlFromBrandAssets } from "../domain/shop-contact"
import { GreetingCatalogRepository } from "./greeting-catalog-repository"

/** Đọc thông tin công khai của tiệm (tên, SĐT, địa chỉ, email, website, logo, chính sách) cho trang khách. */
export class ShopContactRepository {
  constructor(
    private readonly db = prisma,
    private readonly assets = new GreetingCatalogRepository(),
  ) {}

  async findByOrganizationId(organizationId: string) {
    const row = await this.db.organizations.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        ...ORG_SETTINGS_SELECT, // ngành theo cột industry_key (ADR-012 T-6c-1)
        business_profile: { select: { display_name: true, phone: true, address: true, email: true, website: true, social_links: true } },
        brand_profile: { select: { logo_asset_id: true, brand_assets: true } },
      },
    })
    if (!row) return null
    const org = withIndustryKey(row)
    const logoId = org.brand_profile?.logo_asset_id ?? null
    const logoUrl = logoId ? await this.assets.getAssetStorageUrl(organizationId, logoId) : null
    const zaloQrUrl = zaloQrUrlFromBrandAssets(org.brand_profile?.brand_assets)
    const settingsObj =
      org.settings && typeof org.settings === "object" && !Array.isArray(org.settings)
        ? (org.settings as Record<string, unknown>)
        : null
    const industry = typeof settingsObj?.industry === "string" ? settingsObj.industry : null
    return {
      name: org.business_profile?.display_name || org.name || "Cửa hàng",
      industry,
      phone: org.business_profile?.phone ?? null,
      address: org.business_profile?.address ?? null,
      email: org.business_profile?.email ?? null,
      website: org.business_profile?.website ?? null,
      socialLinks: org.business_profile?.social_links ?? null,
      settings: org.settings,
      logoUrl,
      zaloQrUrl,
    }
  }

  async findOrganizationIdBySlug(slug: string): Promise<string | null> {
    const org = await this.db.organizations.findFirst({
      where: { slug: slug.toLowerCase().trim() },
      select: { id: true },
    })
    return org?.id ?? null
  }
}


let _shopContactRepositorySingleton: ShopContactRepository | null = null
export function getShopContactRepository(): ShopContactRepository {
  if (!_shopContactRepositorySingleton) _shopContactRepositorySingleton = new ShopContactRepository()
  return _shopContactRepositorySingleton
}
