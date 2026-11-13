import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const brandCurrent = vi.fn()
const businessCurrent = vi.fn()
vi.mock("@/modules/profiles/infra/brand-profile-repository", () => ({
  BrandProfileRepository: vi.fn().mockImplementation(function () { return { current: brandCurrent } }),
}))
vi.mock("@/modules/profiles/infra/business-profile-repository", () => ({
  BusinessProfileRepository: vi.fn().mockImplementation(function () { return { current: businessCurrent } }),
}))

import { readShopContext } from "@/modules/content-engine/infra/read-shop-context"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

describe("readShopContext", () => {
  it("chưa khai brand/business profile: mọi trường về rỗng/null, displayName mặc định", async () => {
    brandCurrent.mockResolvedValue(null)
    businessCurrent.mockResolvedValue(null)
    const shop = await readShopContext(ctx)
    // Đa ngành: tên mặc định trung tính, không còn giả định là tiệm hoa
    expect(shop.displayName).toBe("Cửa hàng")
    expect(shop.hashtags).toEqual([])
    expect(shop.defaultOffers).toEqual({ freeGifts: [], guarantees: [] })
    expect(shop.forbiddenStyles).toEqual([])
  })

  it("default_offers dạng đối tượng { free_gifts, guarantees }", async () => {
    brandCurrent.mockResolvedValue({
      tone_of_voice: "thân thiện",
      hashtags: { default: ["#hoatuoi", "#siin"] },
      cta_templates: { default: "Nhắn tin tiệm nhé!" },
      default_offers: { free_gifts: ["Thiệp thiết kế riêng"], guarantees: ["Hoa tươi 5 ngày"] },
      forbidden_styles: "chợ búa, giật gân",
    })
    businessCurrent.mockResolvedValue({
      display_name: "SiiN Store",
      legal_name: null,
      phone: "0909xxxxxx",
      address: "123 Đường ABC",
      website: "https://siinstore.vn",
      operating_hours: "8:00 - 20:00",
    })
    const shop = await readShopContext(ctx)
    expect(shop.displayName).toBe("SiiN Store")
    expect(shop.hashtags).toEqual(["#hoatuoi", "#siin"])
    expect(shop.ctaPhrase).toBe("Nhắn tin tiệm nhé!")
    expect(shop.defaultOffers).toEqual({ freeGifts: ["Thiệp thiết kế riêng"], guarantees: ["Hoa tươi 5 ngày"] })
    expect(shop.forbiddenStyles).toEqual(["chợ búa", "giật gân"])
    expect(shop.phone).toBe("0909xxxxxx")
    expect(shop.operatingHours).toBe("8:00 - 20:00")
  })

  it("forbidden_styles dạng mảng: giữ nguyên từng mục", async () => {
    brandCurrent.mockResolvedValue({ forbidden_styles: ["xả kho lỗ vốn", "rẻ như cho"] })
    businessCurrent.mockResolvedValue({ display_name: "Tiệm B" })
    const shop = await readShopContext(ctx)
    expect(shop.forbiddenStyles).toEqual(["xả kho lỗ vốn", "rẻ như cho"])
  })

  it("chưa khai default_offers: không suy đoán, trả mảng rỗng chứ không bịa", async () => {
    brandCurrent.mockResolvedValue({ default_offers: null })
    businessCurrent.mockResolvedValue({ display_name: "Tiệm C" })
    const shop = await readShopContext(ctx)
    expect(shop.defaultOffers).toEqual({ freeGifts: [], guarantees: [] })
  })
})
