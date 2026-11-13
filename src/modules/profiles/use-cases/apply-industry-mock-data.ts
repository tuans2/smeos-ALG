import { AppError } from "@/core/http/errors"
import {
  SAMPLE_PRODUCT_CODE_PREFIX,
  SampleCatalogRepository,
  type SampleProductInput,
} from "@/modules/profiles/infra/sample-catalog-repository"
import type { TenantContext } from "@/core/tenancy"
import { BusinessProfileRepository } from "@/modules/profiles/infra/business-profile-repository"
import { BrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import { getIndustrySeedProfiles } from "@/modules/profiles/use-cases/seed-experience-profile"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { getMockAssetsForIndustry } from "@/modules/profiles/domain/mock-data-catalog"

export interface ApplyMockDataResult {
  industryKey: string
  industryName: string
  businessName: string
  productsCount: number
}

/**
 * Ghi đè hoặc nạp mock data của ngành vào hồ sơ và danh mục sản phẩm của tổ chức hiện tại.
 * Chỉ cho tổ chức dùng thử (`EXPERIENCE`); quyền F2/H4 kiểm ở route.
 */
export async function applyIndustryMockData(
  ctx: TenantContext,
  targetIndustryKey?: string
): Promise<ApplyMockDataResult> {
  const catalog = new SampleCatalogRepository()
  const org = await catalog.findOrganization(ctx.organizationId)

  if (!org) {
    throw new AppError("NOT_FOUND", "Không tìm thấy tổ chức")
  }
  // PO 21/10/2026: chỉ tài khoản dùng thử — nạp mẫu ghi đè hồ sơ và đổi ngành của tiệm thật (H9)
  if (org.type !== "EXPERIENCE") {
    throw new AppError("CAPABILITY_DENIED", "Dữ liệu mẫu chỉ dùng cho tài khoản dùng thử.")
  }

  const orgSettings = (org.settings as Record<string, unknown>) || {}
  const industryKey =
    targetIndustryKey ||
    (typeof orgSettings.industry === "string" ? orgSettings.industry : "FLORAL")

  // 0. Cập nhật ngành trong organization settings nếu đổi sang ngành mới
  if (targetIndustryKey && orgSettings.industry !== targetIndustryKey) {
    await catalog.updateOrganizationSettings(ctx.organizationId, { ...orgSettings, industry: targetIndustryKey })
  }

  const plugin = getIndustryPlugin(industryKey)
  const seedProfiles = getIndustrySeedProfiles(industryKey)
  const mockAssets = getMockAssetsForIndustry(industryKey)

  // 1. Cập nhật Business Profile
  const bizRepo = new BusinessProfileRepository()
  await bizRepo.upsert(ctx, {
    ...seedProfiles.business,
    display_name: seedProfiles.business.display_name,
  })

  // 2. Cập nhật Brand Profile (kèm logo mock)
  const brandRepo = new BrandProfileRepository()
  await brandRepo.upsert(ctx, {
    ...seedProfiles.brand,
    logo_asset_id: mockAssets?.logo || seedProfiles.brand.logo_asset_id,
  })

  // 3. Nạp danh mục sản phẩm mẫu — thay các sản phẩm mẫu cũ trong một giao dịch
  const categories = plugin.taxonomy.defaultCategories
  const samples: SampleProductInput[] = (mockAssets?.products ?? []).map((p, i) => ({
    code: `${SAMPLE_PRODUCT_CODE_PREFIX}${industryKey.slice(0, 3)}-${String(i + 1).padStart(3, "0")}`,
    name: p.name,
    category: p.category,
    attributes: {
      sample: true,
      imageUrl: p.image,
      price: p.price,
      original_price: p.originalPrice,
      description: p.description,
      unit: categories[0]?.defaultUnit || "món",
    },
    variantAttributes: { price: p.price, original_price: p.originalPrice },
  }))
  const productsCount = await catalog.replaceSampleProducts(ctx.organizationId, samples)

  return {
    industryKey,
    industryName: plugin.identity.name,
    businessName: seedProfiles.business.display_name,
    productsCount,
  }
}
