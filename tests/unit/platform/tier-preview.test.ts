import { describe, expect, it } from "vitest"

import {
  buildTierPreview,
  canUseTierPreview,
  entryHrefFor,
  parseTierPreview,
} from "@/modules/platform/domain/tier-preview"

describe("tier-preview", () => {
  it("chỉ người vận hành có N1 mới xem trước tầng", () => {
    expect(canUseTierPreview(["N1", "N5"])).toBe(true)
    expect(canUseTierPreview(["N5"])).toBe(false)
    expect(canUseTierPreview([])).toBe(false)
  })

  it("suy loại tổ chức từ danh mục cho cả 4 tầng", () => {
    expect(buildTierPreview("platform_admin")?.organizationType).toBe("PLATFORM")
    expect(buildTierPreview("industry_admin")?.organizationType).toBe("INDUSTRY")
    expect(buildTierPreview("flower_network_admin")?.organizationType).toBe("CHAIN")
    expect(buildTierPreview("store_admin")?.organizationType).toBe("SINGLE")
  })

  it("từ chối vai không tồn tại hoặc đang phát triển", () => {
    expect(buildTierPreview("khong_co")).toBeNull()
    expect(buildTierPreview("ceo")).toBeNull()
    expect(parseTierPreview("")).toBeNull()
    expect(parseTierPreview(null)).toBeNull()
  })

  it("đưa SaaS Mother về console vận hành", () => {
    expect(entryHrefFor("platform_admin")).toBe("/van-hanh")
    expect(entryHrefFor("industry_admin")).toBe("/")
  })
})
