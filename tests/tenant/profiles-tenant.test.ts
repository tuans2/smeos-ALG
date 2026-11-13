import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { putBusinessProfile } from "@/modules/profiles/use-cases/put-business-profile"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"

describe("profiles tenant isolation (Hồ sơ kinh doanh & Nhận diện thương hiệu)", () => {
  let tenantA: Tenant
  let tenantB: Tenant

  beforeEach(async () => {
    await resetDatabase()
    tenantA = await createTenant("alpha")
    tenantB = await createTenant("beta")

    // Gán mã năng lực F1 (xem hồ sơ) và F2 (sửa hồ sơ)
    const profileCaps = new Set(["F1", "F2"])
    tenantA = {
      ...tenantA,
      ctx: {
        ...tenantA.ctx,
        capabilities: new Set([...tenantA.ctx.capabilities, ...profileCaps]),
      },
    }
    tenantB = {
      ...tenantB,
      ctx: {
        ...tenantB.ctx,
        capabilities: new Set([...tenantB.ctx.capabilities, ...profileCaps]),
      },
    }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("cách ly tuyệt đối hồ sơ kinh doanh giữa Tenant A và Tenant B", async () => {
    // Ban đầu cả 2 đều rỗng (chưa nhập)
    expect(await getBusinessProfile(tenantA.ctx)).toBeNull()
    expect(await getBusinessProfile(tenantB.ctx)).toBeNull()

    // Tenant A nhập hồ sơ
    await putBusinessProfile(tenantA.ctx, {
      display_name: "Tiệm Hoa Mộc Lan Alpha",
      phone: "0901 111 222",
      email: "alpha@moclan.vn",
      address: "123 Đường Alpha, Quận 1",
    })

    // Tenant B nhập hồ sơ khác
    await putBusinessProfile(tenantB.ctx, {
      display_name: "Tiệm Hoa Hồng Nhung Beta",
      phone: "0902 333 444",
      email: "beta@hongnhung.vn",
      address: "456 Đường Beta, Quận 3",
    })

    // Đối soát dữ liệu Tenant A
    const profileA = await getBusinessProfile(tenantA.ctx)
    expect(profileA).not.toBeNull()
    expect(profileA?.display_name).toBe("Tiệm Hoa Mộc Lan Alpha")
    expect(profileA?.phone).toBe("0901 111 222")
    expect(profileA?.email).toBe("alpha@moclan.vn")

    // Đối soát dữ liệu Tenant B
    const profileB = await getBusinessProfile(tenantB.ctx)
    expect(profileB).not.toBeNull()
    expect(profileB?.display_name).toBe("Tiệm Hoa Hồng Nhung Beta")
    expect(profileB?.phone).toBe("0902 333 444")
    expect(profileB?.email).toBe("beta@hongnhung.vn")
  })

  it("cách ly tuyệt đối hồ sơ thương hiệu (5 mã màu & tone of voice) giữa các tenant", async () => {
    // Tenant A cấu hình phong cách Thơ mộng & tông hồng đỏ
    await putBrandProfile(tenantA.ctx, {
      primary_color: "#e11d48",
      secondary_color: "#fda4af",
      accent_color: "#f59e0b",
      background_color: "#ffffff",
      text_color: "#111827",
      font_heading: "Playfair Display",
      font_body: "Inter",
      tone_of_voice: "romantic",
      hashtags: { default: ["#moclan", "#hoatuoi"] },
      cta_templates: { default: "Ghé Mộc Lan ngay hôm nay" },
    })

    // Tenant B cấu hình phong cách Sang trọng & tông xanh hoàng gia
    await putBrandProfile(tenantB.ctx, {
      primary_color: "#1e3a8a",
      secondary_color: "#93c5fd",
      accent_color: "#eab308",
      background_color: "#f8fafc",
      text_color: "#0f172a",
      font_heading: "Montserrat",
      font_body: "Roboto",
      tone_of_voice: "luxury",
      hashtags: { default: ["#hongnhung", "#luxuryflowers"] },
      cta_templates: { default: "Liên hệ Hotline VIP" },
    })

    // Xác minh Tenant A giữ nguyên bản sắc
    const brandA = await getBrandProfile(tenantA.ctx)
    expect(brandA?.primary_color).toBe("#e11d48")
    expect(brandA?.tone_of_voice).toBe("romantic")
    expect(brandA?.font_heading).toBe("Playfair Display")

    // Xác minh Tenant B giữ nguyên bản sắc
    const brandB = await getBrandProfile(tenantB.ctx)
    expect(brandB?.primary_color).toBe("#1e3a8a")
    expect(brandB?.tone_of_voice).toBe("luxury")
    expect(brandB?.font_heading).toBe("Montserrat")
  })
})
