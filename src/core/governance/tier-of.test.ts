import { describe, expect, it } from "vitest"

import { isChainTier, organizationTierOf, tierOf } from "./tier-of"

describe("tier-of — một nơi xác định tầng", () => {
  it("SaaS Ngành: loại INDUSTRY hoặc vai industry_admin (kiểm trước Mẹ dù vai thuộc nhóm PLATFORM)", () => {
    expect(tierOf("INDUSTRY", null)).toBe("INDUSTRY")
    expect(tierOf("SINGLE", { key: "industry_admin", group: "PLATFORM" })).toBe("INDUSTRY")
  })

  it("SaaS Mẹ: loại PLATFORM, nhóm PLATFORM hoặc vai platform_admin", () => {
    expect(tierOf("PLATFORM", null)).toBe("MOTHER")
    expect(tierOf("SINGLE", { key: "platform_admin", group: "PLATFORM" })).toBe("MOTHER")
    expect(tierOf("SINGLE", { key: "x", group: "PLATFORM" })).toBe("MOTHER")
  })

  it("ChainOS: loại CHAIN, nhóm vai chuỗi hoặc flower_network_admin", () => {
    expect(tierOf("CHAIN", null)).toBe("CHAIN")
    expect(tierOf("SINGLE", { key: "chain_manager", group: "CHAIN" })).toBe("CHAIN")
    expect(tierOf(null, { key: "flower_network_admin" })).toBe("CHAIN")
  })

  it("StoreOS: mọi trường hợp còn lại", () => {
    expect(tierOf("SINGLE", null)).toBe("STORE")
    expect(tierOf("EXPERIENCE", { key: "owner", group: "STORE" })).toBe("STORE")
    expect(tierOf(undefined, undefined)).toBe("STORE")
  })

  it("isChainTier khớp nhánh CHAIN của tierOf", () => {
    expect(isChainTier("CHAIN")).toBe(true)
    expect(isChainTier("STORE", { group: "FLOWER_NETWORK" })).toBe(true)
    expect(isChainTier("SINGLE", { key: "owner" })).toBe(false)
  })

  it("tầng dữ liệu của tổ chức tenant chỉ là CHAIN hoặc STORE", () => {
    expect(organizationTierOf("CHAIN")).toBe("CHAIN")
    expect(organizationTierOf("SINGLE")).toBe("STORE")
    expect(organizationTierOf(null)).toBe("STORE")
  })
})
