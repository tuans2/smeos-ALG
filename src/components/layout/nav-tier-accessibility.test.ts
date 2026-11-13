import { describe, expect, it } from "vitest"
import { ROLE_UX_CATALOG } from "@/modules/organization/domain/role-ux-catalog"
import { buildNav } from "./nav-model"
import { INDUSTRY_NAV_ENTRIES } from "./nav/nav-industry"
import { CHAIN_NAV_ENTRIES } from "./nav/nav-chain"
import { STORE_NAV_ENTRIES } from "./nav/nav-store-entries"
import { MOTHER_NAV_ENTRIES } from "./nav/nav-mother"

describe("Nav Tier Accessibility (S3-05, D-UI-10, UI-A-05)", () => {
  it("SaaS Ngành (INDUSTRY): 0 mục nào trong nav trỏ tới /van-hanh/* (UI-A-05)", () => {
    const invalidEntries = INDUSTRY_NAV_ENTRIES.filter((e) => e.href.startsWith("/van-hanh"))
    expect(invalidEntries).toHaveLength(0)
  })

  it("ChainOS (CHAIN): 0 mục nào trong nav trỏ tới /van-hanh/*", () => {
    const invalidEntries = CHAIN_NAV_ENTRIES.filter((e) => e.href.startsWith("/van-hanh"))
    expect(invalidEntries).toHaveLength(0)
  })

  it("StoreOS (STORE): 0 mục nào trong nav trỏ tới /van-hanh/*", () => {
    const invalidEntries = STORE_NAV_ENTRIES.filter((e) => e.href.startsWith("/van-hanh"))
    expect(invalidEntries).toHaveLength(0)
  })

  it("SaaS Mother: Mọi mục nav quản trị nền tảng bắt đầu bằng /van-hanh hoặc /cai-dat-ai hoặc /", () => {
    const valid = MOTHER_NAV_ENTRIES.every(
      (e) => e.href === "/" || e.href.startsWith("/van-hanh") || e.href.startsWith("/cai-dat-ai")
    )
    expect(valid).toBe(true)
  })

  it("mọi href trong nav của các vai mẫu đều là URL hợp lệ và không rỗng", () => {
    for (const role of ROLE_UX_CATALOG) {
      if (role.status === "IN_DEVELOPMENT") continue
      const nav = buildNav(() => true, role)
      for (const group of nav.groups) {
        for (const entry of group.entries) {
          expect(entry.href).toBeTruthy()
          expect(entry.href.startsWith("/")).toBe(true)
          expect(entry.label).toBeTruthy()
        }
      }
    }
  })
})
