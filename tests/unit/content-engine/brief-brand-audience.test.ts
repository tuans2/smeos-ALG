import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { contentBriefSchema } from "@/modules/content-engine/contracts/brief"

/** Checklist ALG 9.3 — thông điệp thương hiệu và khách mục tiêu đi vào ngữ cảnh AI (sự kiện "shop" và khối shop của brief). */
const base: BuildContentBriefInput = {
  organizationId: "org-1",
  assetId: null,
  product: {
    productId: "p1", name: "Bó hồng", style: "cổ điển",
    components: [{ flowerType: "Hồng", quantityEstimate: 10, unit: "cành", role: "dominant", color: "đỏ" }],
    packaging: { wrappingMaterial: "giấy", wrappingColor: "nâu", ribbon: null, accessories: [], cardText: null },
    price: { exact: 500000, rangeLabel: null },
  },
  passport: null,
  topic: { topicId: "t1", title: "Sinh nhật", hook: "Quà ý nghĩa", cta: "Nhắn tin" },
  story: null,
  shop: { displayName: "Tiệm A", brandMessage: "Giao đúng hẹn, hoa tươi 3 ngày", targetCustomers: ["Văn phòng", "Cặp đôi"] },
  channels: ["facebook"],
}

describe("brief có thông điệp và khách mục tiêu", () => {
  it("thêm sự kiện shop và trường trong khối shop; brief hợp lệ theo hợp đồng", () => {
    const brief = buildContentBrief(base)
    const texts = brief.facts.map((f) => f.text)
    expect(texts).toContain("Thông điệp thương hiệu: Giao đúng hẹn, hoa tươi 3 ngày")
    expect(texts).toContain("Khách mục tiêu: Văn phòng, Cặp đôi")
    expect(brief.shop).toMatchObject({ brandMessage: "Giao đúng hẹn, hoa tươi 3 ngày", targetCustomers: ["Văn phòng", "Cặp đôi"] })
    expect(contentBriefSchema.safeParse(brief).success).toBe(true)
  })

  it("không khai thì không thêm sự kiện", () => {
    const brief = buildContentBrief({ ...base, shop: { displayName: "Tiệm A" } })
    expect(brief.facts.some((f) => f.text.startsWith("Thông điệp thương hiệu"))).toBe(false)
    expect(brief.shop.targetCustomers).toEqual([])
  })
})
