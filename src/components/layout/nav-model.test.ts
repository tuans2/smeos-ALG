import { describe, expect, it } from "vitest"

import {
  buildNav,
  mobileSecondSlot,
  NAV_ENTRIES,
  HOME_ENTRY,
} from "./nav-model"
import { stripVietnamese } from "@/lib/utils"
import { defaultCodesForSystemRole } from "@/core/rbac/capability-catalog"
import { ROLE_UX_CATALOG } from "@/modules/organization/domain/role-ux-catalog"

describe("nav-model (Kiến trúc điều hướng SSOT)", () => {
  const roleSales = ROLE_UX_CATALOG.find((r) => r.key === "sales")!
  const roleCoordinator = ROLE_UX_CATALOG.find((r) => r.key === "coordinator")!

  it("1. can = () => true + role = null → đủ 6 nhóm (trừ viec-chinh), không mục trùng", () => {
    const nav = buildNav(() => true, null)
    expect(nav.groups.map((g) => g.key)).toEqual([
      "cong-cu",
      "ban-hang",
      "san-pham",
      "kho",
      "van-hanh",
      "quan-tri",
    ])

    const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))
    const uniqueHrefs = new Set(allHrefs)
    expect(allHrefs.length).toBe(uniqueHrefs.size)
  })

  it("2. Vai sales với năng lực mặc định của sale → không có /dieu-phoi, không có /cai-dat-ai; viec-chinh bắt đầu bằng /, rồi /khach-hang", () => {
    const saleCodes = new Set(defaultCodesForSystemRole("sale"))
    const canSale = (code: string) => saleCodes.has(code)

    const nav = buildNav(canSale, roleSales)
    const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))

    expect(allHrefs).not.toContain("/dieu-phoi")
    expect(allHrefs).not.toContain("/cai-dat-ai")

    const viecChinhGroup = nav.groups.find((g) => g.key === "viec-chinh")
    expect(viecChinhGroup).toBeDefined()
    expect(viecChinhGroup!.entries[0]?.href).toBe("/")
    expect(viecChinhGroup!.entries[1]?.href).toBe("/khach-hang")
  })

  it("3. Vai coordinator → ô thứ hai mobile là /dieu-phoi", () => {
    const coordCodes = new Set(defaultCodesForSystemRole("dieu_phoi"))
    const canCoord = (code: string) => coordCodes.has(code)

    const slot2 = mobileSecondSlot(canCoord, roleCoordinator)
    expect(slot2.href).toBe("/dieu-phoi")
  })

  it("4. Mục COMING_SOON (nếu có) không bao giờ vào viec-chinh", () => {
    const nav = buildNav(() => true, roleSales)
    const viecChinh = nav.groups.find((g) => g.key === "viec-chinh")!

    expect(viecChinh.entries.some((e) => e.status === "COMING_SOON")).toBe(false)
  })

  it("5. Mỗi href có mặt đúng một lần trong toàn bộ kết quả", () => {
    const rolesToTest = [null, roleSales, roleCoordinator]
    for (const role of rolesToTest) {
      const nav = buildNav(() => true, role)
      const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))
      const uniqueHrefs = new Set(allHrefs)
      expect(allHrefs.length).toBe(uniqueHrefs.size)
    }
  })

  it("6. Không chứa nhãn mã kỹ thuật (R8) trong toàn bộ NAV_ENTRIES", () => {
    const techPatterns = [
      /\bM0[0-9][a-z]?\b/i,
      /\bSSOT\b/i,
      /Khu vực [A-F]/i,
      /Tháp Vận Hành/i,
    ]

    for (const entry of NAV_ENTRIES) {
      for (const pattern of techPatterns) {
        expect(entry.label).not.toMatch(pattern)
        if (entry.mobileLabel) {
          expect(entry.mobileLabel).not.toMatch(pattern)
        }
      }
    }
  })

  it("7. Tìm kiếm nhanh không phân biệt dấu tiếng Việt", () => {
    const filterByQuery = (q: string) => {
      const normalizedQuery = stripVietnamese(q.trim())
      return NAV_ENTRIES.filter((e) =>
        stripVietnamese(e.label).includes(normalizedQuery)
      )
    }

    const donResults = filterByQuery("don")
    expect(donResults.map((r) => r.href)).toContain("/don-hang")

    const khachResults = filterByQuery("khach")
    expect(khachResults.map((r) => r.href)).toContain("/khach-hang")

    const sanPhamResults = filterByQuery("san pham")
    expect(sanPhamResults.map((r) => r.href)).toContain("/san-pham")
  })

  it("8. Điều hướng thích ứng động theo ngành (Fashion, FNB...)", () => {
    // Ngành Thời trang (FASHION)
    const fashionNav = buildNav(() => true, null, "FASHION")
    const fashionEntries = fashionNav.groups.flatMap((g) => g.entries)
    const theChaoFashion = fashionEntries.find((e) => e.href === "/the-chao")
    const taoMoiFashion = fashionEntries.find((e) => e.href === "/san-pham/tao-moi")
    const quetAnhFashion = fashionEntries.find((e) => e.href === "/tai-anh")

    expect(theChaoFashion?.label).toBe("Bộ sưu tập riêng")
    expect(taoMoiFashion?.label).toBe("Thêm mẫu thiết kế")
    expect(quetAnhFashion?.label).toBe("Quét mẫu trang phục")

    // Ngành mặc định (FLORAL)
    const floralNav = buildNav(() => true, null, "FLORAL")
    const floralEntries = floralNav.groups.flatMap((g) => g.entries)
    expect(floralEntries.find((e) => e.href === "/the-chao")?.label).toBe("Bộ sưu tập riêng")
  })

  it("9. Vai platform_admin → đủ 6 nhóm quản trị nền tảng (tong-quan, to-chuc-dich-vu, san-pham-kho-platform, ha-tang-tai-nguyen, do-tin-cay-bao-mat, thiet-lap-platform)", () => {
    const rolePlatform = ROLE_UX_CATALOG.find((r) => r.key === "platform_admin")!
    const nav = buildNav(() => true, rolePlatform)

    expect(nav.groups.map((g) => g.key)).toEqual([
      "tong-quan",
      "to-chuc-dich-vu",
      "san-pham-kho-platform",
      "ha-tang-tai-nguyen",
      "do-tin-cay-bao-mat",
      "ma-tran-governance",
      "thiet-lap-platform",
    ])

    const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))
    expect(allHrefs).toContain("/van-hanh")
    expect(allHrefs).toContain("/van-hanh/to-chuc")
    expect(allHrefs).toContain("/van-hanh/dang-ky")
    expect(allHrefs).toContain("/van-hanh/phe-duyet")
    expect(allHrefs).toContain("/van-hanh/nganh")
    expect(allHrefs).toContain("/cai-dat-ai")
    expect(allHrefs).toContain("/van-hanh/muc-dung")
    expect(allHrefs).toContain("/van-hanh/du-lieu")
    expect(allHrefs).toContain("/van-hanh/suc-khoe")
    expect(allHrefs).toContain("/van-hanh/nhat-ky")
    expect(allHrefs).toContain("/van-hanh/truong-du-lieu")

    // Ô thứ hai mobile cho platform_admin
    const slot2 = mobileSecondSlot(() => true, rolePlatform)
    expect(slot2.href).toBe("/van-hanh/to-chuc")
  })

  it("10. Vai industry_admin → đủ 6 nhóm quản trị SaaS Đa Ngành (trung-tam-dieu-hanh, cong-cu-ban-hang, san-pham-nganh, mang-luoi-dieu-phoi, hieu-qua-thuong-mai, thiet-lap-nganh)", () => {
    const roleIndustry = ROLE_UX_CATALOG.find((r) => r.key === "industry_admin")!
    const nav = buildNav(() => true, roleIndustry)

    expect(nav.groups.map((g) => g.key)).toEqual([
      "trung-tam-dieu-hanh",
      "cong-cu-ban-hang",
      "san-pham-nganh",
      "mang-luoi-dieu-phoi",
      "hieu-qua-thuong-mai",
      "thiet-lap-nganh",
    ])

    const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))
    expect(allHrefs).toContain("/")
    expect(allHrefs).toContain("/landing-page")
    expect(allHrefs).toContain("/catalog")
    expect(allHrefs).toContain("/the-chao")
    expect(allHrefs).toContain("/kho-templates")
    expect(allHrefs).toContain("/creative-studio")
    expect(allHrefs).toContain("/san-pham")
    expect(allHrefs).toContain("/dieu-phoi/doi-tac")
    expect(allHrefs).toContain("/don-hang")
    expect(allHrefs).toContain("/dieu-phoi")
    expect(allHrefs).toContain("/duyet")
    expect(allHrefs).toContain("/market-intelligence")
    expect(allHrefs).toContain("/so-lieu")
    expect(allHrefs).toContain("/cai-dat")

    // Ô thứ hai mobile cho industry_admin
    const slot2 = mobileSecondSlot(() => true, roleIndustry)
    expect(slot2.href).toBe("/san-pham")
  })

  it("11. Vai ChainOS (flower_network_admin hoặc organizationType=CHAIN) → đủ 6 nhóm điều hành chuỗi theo chuẩn", () => {
    const roleChain = ROLE_UX_CATALOG.find((r) => r.key === "flower_network_admin")!
    const nav = buildNav(() => true, roleChain, null, null, "CHAIN")

    expect(nav.groups.map((g) => g.key)).toEqual([
      "dieu-hanh-chuoi",
      "cong-cu-chuoi",
      "san-pham-kho-chuoi",
      "kinh-doanh-chuoi",
      "bao-cao-tai-chinh-chuoi",
      "thiet-lap-chuoi",
    ])

    const allHrefs = nav.groups.flatMap((g) => g.entries.map((e) => e.href))
    expect(allHrefs).toContain("/")
    expect(allHrefs).toContain("/don-hang")
    expect(allHrefs).toContain("/dieu-phoi")
    expect(allHrefs).toContain("/duyet")
    expect(allHrefs).toContain("/catalog")
    expect(allHrefs).toContain("/the-chao")
    expect(allHrefs).toContain("/creative-studio")
    expect(allHrefs).toContain("/video")
    expect(allHrefs).toContain("/kho-templates")
    expect(allHrefs).toContain("/san-pham")
    expect(allHrefs).toContain("/khach-hang")
    expect(allHrefs).toContain("/hoi-thoai")
    expect(allHrefs).toContain("/dieu-phoi/doi-tac")
    expect(allHrefs).toContain("/san-pham/kha-dung")
    expect(allHrefs).toContain("/so-lieu")
    expect(allHrefs).toContain("/du-lieu")
    expect(allHrefs).toContain("/cai-dat")

    // Ô thứ hai mobile cho ChainOS
    const slot2 = mobileSecondSlot(() => true, roleChain, null, null, "CHAIN")
    expect(slot2.href).toBe("/dieu-phoi")
  })
})


