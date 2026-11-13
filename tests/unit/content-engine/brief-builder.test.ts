import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { contentBriefSchema, BRIEF_VERSION } from "@/modules/content-engine/contracts/brief"

const baseInput: BuildContentBriefInput = {
  organizationId: "org_1",
  assetId: "asset_1",
  product: {
    productId: "prod_1",
    name: "Bó hoa hồng đỏ 20 cành",
    style: "cổ điển",
    components: [{ flowerType: "Hồng đỏ", quantityEstimate: 20, unit: "cành", role: "dominant", color: "đỏ" }],
    packaging: { wrappingMaterial: "giấy kraft", wrappingColor: "nâu", ribbon: "lụa đỏ", accessories: [], cardText: null },
    price: { exact: 650000, rangeLabel: null },
  },
  passport: {
    sellingPoints: ["Hoa nhập khẩu tuyển chọn"],
    flowerMeaningStory: "Hoa hồng đỏ tượng trưng cho tình yêu.",
    occasions: ["sinh nhật"],
  },
  topic: { topicId: "topic_1", title: "Bó hoa sinh nhật tone đỏ", hook: "Món quà nói hộ lời yêu thương", cta: "Nhắn tin đặt ngay" },
  story: null,
  shop: {
    displayName: "SiiN Store",
    toneOfVoice: "thân thiện",
    hashtags: ["#hoatuoi"],
    ctaPhrase: "Nhắn tin tiệm nhé!",
    defaultOffers: { freeGifts: [], guarantees: [] },
    forbiddenStyles: [],
  },
  channels: ["facebook", "instagram"],
}

describe("buildContentBrief", () => {
  it("sinh Brief hợp lệ theo đúng zod v1", () => {
    const brief = buildContentBrief(baseInput)
    expect(() => contentBriefSchema.parse(brief)).not.toThrow()
    expect(brief.briefVersion).toBe(BRIEF_VERSION)
  })

  it("tiệm chưa khai default_offers → không có fact nào ở nhóm offer", () => {
    const brief = buildContentBrief(baseInput)
    expect(brief.facts.some((f) => f.category === "offer")).toBe(false)
  })

  it("tiệm khai default_offers → có fact ở nhóm offer, đúng nội dung", () => {
    const brief = buildContentBrief({
      ...baseInput,
      shop: { ...baseInput.shop, defaultOffers: { freeGifts: ["Thiệp thiết kế riêng"], guarantees: ["Hoa tươi 5 ngày"] } },
    })
    const offerFacts = brief.facts.filter((f) => f.category === "offer")
    expect(offerFacts).toHaveLength(2)
    expect(offerFacts.map((f) => f.text)).toEqual(
      expect.arrayContaining([expect.stringContaining("Thiệp thiết kế riêng"), expect.stringContaining("Hoa tươi 5 ngày")])
    )
  })

  it("mỗi thành phần hoa sinh đúng một fact 'component'", () => {
    const brief = buildContentBrief({
      ...baseInput,
      product: {
        ...baseInput.product,
        components: [
          { flowerType: "Hồng đỏ", quantityEstimate: 20, unit: "cành", role: "dominant", color: "đỏ" },
          { flowerType: "Baby trắng", quantityEstimate: 5, unit: "cành", role: "foliage", color: "trắng" },
        ],
      },
    })
    const componentFacts = brief.facts.filter((f) => f.category === "component")
    expect(componentFacts).toHaveLength(2)
  })

  it("channels lắp đúng theo CHANNEL_SPECS, không tự thêm kênh ngoài input", () => {
    const brief = buildContentBrief(baseInput)
    expect(brief.channels.map((c) => c.channel)).toEqual(["facebook", "instagram"])
  })

  it("story vắng thì brief.story là null, không có fact 'story'", () => {
    const brief = buildContentBrief(baseInput)
    expect(brief.story).toBeNull()
    expect(brief.facts.some((f) => f.category === "story")).toBe(false)
  })

  it("story có mặt thì sinh fact 'story' từ logline/hook/cta", () => {
    const brief = buildContentBrief({
      ...baseInput,
      story: { scenePlanId: "scene_1", mode: "AUTHENTIC", logline: "Một sáng chuẩn bị hoa", sceneLines: ["Cảnh 1"] },
    })
    expect(brief.story?.scenePlanId).toBe("scene_1")
    expect(brief.facts.some((f) => f.category === "story")).toBe(true)
  })

  it("factId ổn định và duy nhất trong một lần build", () => {
    const brief = buildContentBrief(baseInput)
    const ids = brief.facts.map((f) => f.factId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("thiếu giá (không exact, không rangeLabel) thì không có fact 'price'", () => {
    const brief = buildContentBrief({
      ...baseInput,
      product: { ...baseInput.product, price: { exact: null, rangeLabel: null } },
    })
    expect(brief.facts.some((f) => f.category === "price")).toBe(false)
  })

  it("rules.forbiddenStyles khớp shop.forbiddenStyles", () => {
    const brief = buildContentBrief({ ...baseInput, shop: { ...baseInput.shop, forbiddenStyles: ["chợ búa"] } })
    expect(brief.rules.forbiddenStyles).toEqual(["chợ búa"])
    expect(brief.shop.forbiddenStyles).toEqual(["chợ búa"])
  })
})
