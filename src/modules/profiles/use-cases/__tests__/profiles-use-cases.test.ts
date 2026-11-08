import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IBrandProfileRepository } from "../../domain/repositories/brand-profile-repository.interface"
import type { IBusinessProfileRepository } from "../../domain/repositories/business-profile-repository.interface"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import { getBrandProfile } from "../get-brand-profile"
import { putBrandProfile } from "../put-brand-profile"
import { getBusinessProfile } from "../get-business-profile"
import { putBusinessProfile } from "../put-business-profile"

const ctx: TenantContext = {
  organizationId: "org-profiles-01",
  userId: "user-profiles-01",
  workspaceId: "ws-profiles-01",
  branchId: null,
  capabilities: new Set(["F1", "F2"]),
}

describe("profiles: Brand Profile use-cases with DI", () => {
  const mockBrandRepo: IBrandProfileRepository = {
    current: vi.fn(),
    upsert: vi.fn(),
  }

  const mockAssetRepo: IAssetRepository = {
    findById: vi.fn(),
    findByOrganizationId: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findMasterByJobId: vi.fn(),
    approve: vi.fn(),
    findApprovedMaster: vi.fn(),
    listByJobId: vi.fn(),
    listDerivedFrom: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getBrandProfile trả về null khi chưa cấu hình", async () => {
    vi.mocked(mockBrandRepo.current).mockResolvedValue(null)
    const result = await getBrandProfile(ctx, mockBrandRepo, mockAssetRepo)
    expect(result).toBeNull()
  })

  it("getBrandProfile trả về dữ liệu khi đã có profile", async () => {
    vi.mocked(mockBrandRepo.current).mockResolvedValue({
      id: "bp-01",
      organization_id: "org-profiles-01",
      primary_color: "#FF0000",
      secondary_color: "#00FF00",
      accent_color: null,
      background_color: null,
      text_color: null,
      font_heading: "Inter",
      font_body: "Inter",
      logo_asset_id: null,
      tone_of_voice: "Friendly",
      hashtags: null,
      cta_templates: null,
      default_offers: null,
      forbidden_styles: null,
      brand_assets: null,
      slogan: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const result = await getBrandProfile(ctx, mockBrandRepo, mockAssetRepo)
    expect(result).not.toBeNull()
    expect(result!.primary_color).toBe("#FF0000")
    expect(result!.font_heading).toBe("Inter")
  })

  it("putBrandProfile gọi repo.upsert và trả về detail mới", async () => {
    vi.mocked(mockBrandRepo.upsert).mockResolvedValue({} as never)
    vi.mocked(mockBrandRepo.current).mockResolvedValue({
      id: "bp-01",
      organization_id: "org-profiles-01",
      primary_color: "#0000FF",
      secondary_color: null,
      accent_color: null,
      background_color: null,
      text_color: null,
      font_heading: null,
      font_body: null,
      logo_asset_id: null,
      tone_of_voice: null,
      hashtags: null,
      cta_templates: null,
      default_offers: null,
      forbidden_styles: null,
      brand_assets: null,
      slogan: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const result = await putBrandProfile(
      ctx,
      { primary_color: "#0000FF" },
      mockBrandRepo
    )
    expect(result.primary_color).toBe("#0000FF")
    expect(mockBrandRepo.upsert).toHaveBeenCalledTimes(1)
  })
})

describe("profiles: Business Profile use-cases with DI", () => {
  const mockBizRepo: IBusinessProfileRepository = {
    current: vi.fn(),
    upsert: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getBusinessProfile trả về null khi chưa có hồ sơ", async () => {
    vi.mocked(mockBizRepo.current).mockResolvedValue(null)
    const result = await getBusinessProfile(ctx, mockBizRepo)
    expect(result).toBeNull()
  })

  it("putBusinessProfile gọi repo.upsert và trả về detail", async () => {
    vi.mocked(mockBizRepo.upsert).mockResolvedValue({} as never)
    vi.mocked(mockBizRepo.current).mockResolvedValue({
      id: "biz-01",
      organization_id: "org-profiles-01",
      legal_name: "Công ty TNHH Thử Nghiệm",
      display_name: "Tiệm Thử Nghiệm",
      phone: "0901234567",
      email: "shop@test.com",
      address: "123 Đường Test",
      website: null,
      social_links: null,
      tax_code: null,
      description: null,
      operating_hours: null,
      brand_message: null,
      target_customers: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const result = await putBusinessProfile(
      ctx,
      { display_name: "Tiệm Thử Nghiệm", email: "shop@test.com" },
      mockBizRepo
    )
    expect(result.display_name).toBe("Tiệm Thử Nghiệm")
    expect(mockBizRepo.upsert).toHaveBeenCalledTimes(1)
  })
})
