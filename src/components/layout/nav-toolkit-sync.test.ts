import { describe, expect, it } from "vitest"
import { TOOLKIT_GROUP_KEYS, isToolkitGroupKey } from "./nav/nav-types"
import { buildStoreNav } from "./nav/nav-store"
import { buildChainNav } from "./nav/nav-chain"
import { buildIndustryNav } from "./nav/nav-industry"

describe("SSOT Đồng bộ Nhóm Công cụ trên các tầng (Toolkit Multi-Tier Synchronization)", () => {
  const allowAll = () => true

  it("1. Định danh TOOLKIT_GROUP_KEYS bao phủ đầy đủ 3 tầng điều hành", () => {
    expect(TOOLKIT_GROUP_KEYS).toContain("cong-cu")           // Tầng 4: StoreOS
    expect(TOOLKIT_GROUP_KEYS).toContain("cong-cu-chuoi")     // Tầng 3: ChainOS
    expect(TOOLKIT_GROUP_KEYS).toContain("cong-cu-ban-hang")  // Tầng 2: SaaS Ngành

    expect(isToolkitGroupKey("cong-cu")).toBe(true)
    expect(isToolkitGroupKey("cong-cu-chuoi")).toBe(true)
    expect(isToolkitGroupKey("cong-cu-ban-hang")).toBe(true)
    expect(isToolkitGroupKey("viec-chinh")).toBe(false)
  })

  it("2. Tầng 4 (StoreOS) có đúng 1 nhóm công cụ chứa mục Thư viện trỏ đến /cong-cu", () => {
    const nav = buildStoreNav(allowAll, null)
    const toolkitGroup = nav.groups.find((g) => isToolkitGroupKey(g.key))

    expect(toolkitGroup).toBeDefined()
    expect(toolkitGroup?.key).toBe("cong-cu")

    const libraryEntry = toolkitGroup?.entries.find(
      (e) => e.href === "/cong-cu" && (e.navKey === "toolkit" || e.iconKey === "LayoutGrid")
    )
    expect(libraryEntry).toBeDefined()
    expect(libraryEntry?.label).toBe("Công cụ")
  })

  it("3. Tầng 3 (ChainOS) có đúng 1 nhóm công cụ chứa mục Thư viện trỏ đến /cong-cu", () => {
    const nav = buildChainNav(allowAll, null)
    const toolkitGroup = nav.groups.find((g) => isToolkitGroupKey(g.key))

    expect(toolkitGroup).toBeDefined()
    expect(toolkitGroup?.key).toBe("cong-cu-chuoi")

    const libraryEntry = toolkitGroup?.entries.find(
      (e) => e.href === "/cong-cu" && (e.navKey === "chain-toolkit" || e.iconKey === "LayoutGrid")
    )
    expect(libraryEntry).toBeDefined()
    expect(libraryEntry?.label).toBe("Công cụ")
  })

  it("4. Tầng 2 (SaaS Ngành) có đúng 1 nhóm công cụ chứa mục Thư viện trỏ đến /cong-cu", () => {
    const nav = buildIndustryNav(allowAll)
    const toolkitGroup = nav.groups.find((g) => isToolkitGroupKey(g.key))

    expect(toolkitGroup).toBeDefined()
    expect(toolkitGroup?.key).toBe("cong-cu-ban-hang")

    const libraryEntry = toolkitGroup?.entries.find(
      (e) => e.href === "/cong-cu" && (e.navKey === "industry-toolkit" || e.iconKey === "LayoutGrid")
    )
    expect(libraryEntry).toBeDefined()
    expect(libraryEntry?.label).toBe("Công cụ")
  })
})
