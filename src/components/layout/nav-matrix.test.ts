import { describe, expect, it } from "vitest"

import {
  ALL_NAV_KEYS,
  HREF_TO_NAV_KEY,
  getHiddenNavKeys,
  isNavKeyVisible,
  filterHrefsByIndustry,
} from "./nav-matrix"
import { NAV_ENTRIES, HOME_ENTRY } from "./nav-model"
import { INDUSTRY_REGISTRY } from "@/modules/organization/domain/industries"

describe("nav-matrix (Industry Navigation Matrix SSOT)", () => {
  it("1. Mỗi NavEntry phải có navKey hợp lệ nằm trong ALL_NAV_KEYS", () => {
    const validKeys = new Set<string>(ALL_NAV_KEYS)

    // HOME_ENTRY
    expect(validKeys.has(HOME_ENTRY.navKey)).toBe(true)

    // Tất cả NAV_ENTRIES
    for (const entry of NAV_ENTRIES) {
      expect(validKeys.has(entry.navKey), `navKey "${entry.navKey}" (href: ${entry.href}) không nằm trong ALL_NAV_KEYS`).toBe(true)
    }
  })

  it("2. HREF_TO_NAV_KEY phủ kín tất cả href trong NAV_ENTRIES + HOME_ENTRY", () => {
    const allHrefs = [HOME_ENTRY.href, ...NAV_ENTRIES.map((e) => e.href)]
    for (const href of allHrefs) {
      expect(HREF_TO_NAV_KEY[href], `href "${href}" thiếu trong HREF_TO_NAV_KEY`).toBeDefined()
    }
  })

  it("3. navKey trong HREF_TO_NAV_KEY khớp với navKey trong NavEntry tương ứng", () => {
    const allEntries = [HOME_ENTRY, ...NAV_ENTRIES]
    for (const entry of allEntries) {
      const mappedKey = HREF_TO_NAV_KEY[entry.href]
      expect(mappedKey, `href "${entry.href}" không có trong HREF_TO_NAV_KEY`).toBeDefined()
      expect(mappedKey).toBe(entry.navKey)
    }
  })

  it("4. Không có navKey trùng lặp trong NAV_ENTRIES (trừ HOME_ENTRY riêng biệt)", () => {
    const seen = new Map<string, string>()
    for (const entry of NAV_ENTRIES) {
      const existing = seen.get(entry.navKey)
      expect(existing, `navKey "${entry.navKey}" bị trùng: "${existing}" và "${entry.href}"`).toBeUndefined()
      seen.set(entry.navKey, entry.href)
    }
  })

  it("5. Phase 1: Tất cả ngành đều có hiddenNavKeys rỗng (100% hiện)", () => {
    for (const [key, plugin] of Object.entries(INDUSTRY_REGISTRY)) {
      expect(
        plugin.navigation.hiddenNavKeys.length,
        `Ngành ${key} có hiddenNavKeys không rỗng`
      ).toBe(0)
    }
  })

  it("6. getHiddenNavKeys trả về Set rỗng cho tất cả ngành hiện tại", () => {
    const industries = ["FLORAL", "FASHION", "FNB", "CRAFT_GIFT", "RETAIL_GENERAL", "SERVICES", "HOMESTAY"]
    for (const industry of industries) {
      const hidden = getHiddenNavKeys(industry)
      expect(hidden.size, `Ngành ${industry} phải có hiddenNavKeys rỗng`).toBe(0)
    }
  })

  it("6b. ghi đè của Admin SaaS (gửi qua phiên) thay mặc định của ngành; rỗng/null thì về mặc định", () => {
    expect([...getHiddenNavKeys("FNB", ["chat", "catalog"])]).toEqual(["chat", "catalog"])
    expect(isNavKeyVisible("chat", "FNB", ["chat"])).toBe(false)
    expect(filterHrefsByIndustry(["/hoi-thoai", "/khach-hang"], "FNB", ["chat"])).not.toContain("/hoi-thoai")
    expect(getHiddenNavKeys("FNB", []).size).toBe(0)
    expect(getHiddenNavKeys("FNB", null).size).toBe(0)
  })

  it("7. isNavKeyVisible trả true cho mọi navKey khi hiddenNavKeys rỗng", () => {
    for (const navKey of ALL_NAV_KEYS) {
      expect(isNavKeyVisible(navKey, "FLORAL")).toBe(true)
      expect(isNavKeyVisible(navKey, "HOMESTAY")).toBe(true)
    }
  })

  it("8. filterHrefsByIndustry giữ nguyên tất cả href khi hiddenNavKeys rỗng", () => {
    const allHrefs = NAV_ENTRIES.map((e) => e.href)
    const filtered = filterHrefsByIndustry(allHrefs, "FASHION")
    expect(filtered).toEqual(allHrefs)
  })

  it("9. Mỗi Industry Plugin phải có khối navigation hợp lệ", () => {
    for (const [key, plugin] of Object.entries(INDUSTRY_REGISTRY)) {
      expect(plugin.navigation, `Ngành ${key} thiếu khối navigation`).toBeDefined()
      expect(Array.isArray(plugin.navigation.hiddenNavKeys), `Ngành ${key}: hiddenNavKeys phải là mảng`).toBe(true)
    }
  })

  it("10. ALL_NAV_KEYS chứa ít nhất 30 navKey (tất cả mục sidebar)", () => {
    expect(ALL_NAV_KEYS.length).toBeGreaterThanOrEqual(30)
  })
})
