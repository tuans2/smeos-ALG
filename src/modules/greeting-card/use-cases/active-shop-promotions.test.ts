import { describe, expect, it, vi } from "vitest"

vi.mock("@/modules/organization/use-cases/governance-matrix", () => ({ loadPolicyGovernance: async () => ({}) }))

import { listActiveShopPromotions, shopDiscountPercent } from "./active-shop-promotions"

const repoWith = (settings: unknown) =>
  ({ findByOrganizationId: async () => ({ settings, industry: null }) }) as never

describe("Ưu đãi đang bật của tiệm", () => {
  it("bỏ ưu đãi tiệm đã tắt — không còn % giảm để in lên ấn phẩm", async () => {
    const settings = {
      store_policies: {
        promotions: [
          { id: "promo-discount-10", title: "Giảm 10%", description: "x", kind: "PERCENT_OFF", config: { percent: 10 }, active: false },
          { id: "promo-free-card", title: "Tặng thiệp", description: "y", kind: "GIFT" },
        ],
      },
    }
    const promos = await listActiveShopPromotions("org-1", repoWith(settings))
    expect(promos.map((p) => p.title)).toEqual(["Tặng thiệp"])
    expect(shopDiscountPercent(promos)).toBeUndefined()
  })

  it("lấy đúng % của ưu đãi Giảm % đang bật", async () => {
    const settings = { store_policies: { promotions: [{ id: "p15", title: "Giảm 15%", description: "z", kind: "PERCENT_OFF", config: { percent: 15 } }] } }
    expect(shopDiscountPercent(await listActiveShopPromotions("org-1", repoWith(settings)))).toBe(15)
  })

  it("không tìm thấy tiệm → không có ưu đãi", async () => {
    const repo = { findByOrganizationId: async () => null } as never
    expect(await listActiveShopPromotions("org-1", repo)).toEqual([])
  })
})
