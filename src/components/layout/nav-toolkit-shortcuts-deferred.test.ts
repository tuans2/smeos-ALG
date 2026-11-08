import { describe, expect, it } from "vitest"

import { isDevEnvironment } from "@/lib/dev-environment"
import { DEFERRED_SURFACES, DEFERRED_TOOL_HREFS } from "@/modules/toolkit/domain/deferred-module-content"
import { getAllToolkitNavEntries } from "./nav-toolkit-shortcuts"

describe("lối vào thương hiệu PHÁT_TRIỂN_SAU (PO 08/11/2026)", () => {
  it("ngoài môi trường phát triển, danh sách lối tắt không còn thư viện thương hiệu và danh thiếp", () => {
    expect(isDevEnvironment()).toBe(false)
    const hrefs = getAllToolkitNavEntries().map((e) => e.href)
    for (const h of DEFERRED_TOOL_HREFS) expect(hrefs).not.toContain(h)
    // Lối vào hành trình Thương hiệu vẫn còn
    expect(hrefs).toContain("/ho-so")
  })

  it("sổ lối vào bị ẩn liệt kê đủ 4 nơi", () => {
    expect(Object.keys(DEFERRED_SURFACES)).toEqual([
      "SETTINGS_BRANDING_TAB", "BRAND_LIBRARY_SHORTCUT", "BUSINESS_CARD_SHORTCUT", "LANDING_OFFICIAL_BANNER",
    ])
  })
})
