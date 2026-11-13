import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { buildFallbackPost } from "@/modules/content-engine/domain/fallback-post"

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
    hashtags: ["#hoatuoi", "#quatang", "#sinnstore"],
    ctaPhrase: "Nhắn tin tiệm nhé!",
    defaultOffers: { freeGifts: [], guarantees: [] },
    forbiddenStyles: [],
  },
  channels: ["facebook", "instagram"],
}

describe("buildFallbackPost", () => {
  it("ghép đúng các câu factual từ facts[], có CTA của topic", () => {
    const brief = buildContentBrief(baseInput)
    const post = buildFallbackPost(brief, "facebook")
    expect(post.text).toContain("Bó hoa hồng đỏ 20 cành")
    expect(post.text).toContain("20 cành Hồng đỏ")
    expect(post.text).toContain("Nhắn tin đặt ngay")
    expect(post.factIds.length).toBeGreaterThan(0)
  })

  it("không có offer fact thì không bịa câu khuyến mãi nào", () => {
    const brief = buildContentBrief(baseInput)
    const post = buildFallbackPost(brief, "facebook")
    expect(post.text).not.toMatch(/miễn phí|tặng kèm|giảm giá|freeship/i)
  })

  it("không có topic.cta lẫn shop.ctaPhrase: dùng câu mời liên hệ trung tính, không hứa hẹn", () => {
    const input: BuildContentBriefInput = {
      ...baseInput,
      topic: { ...baseInput.topic, cta: null },
      shop: { ...baseInput.shop, ctaPhrase: null },
    }
    const brief = buildContentBrief(input)
    const post = buildFallbackPost(brief, "zalo")
    expect(post.text).toContain("Nhắn tin cho tiệm để được tư vấn.")
  })

  it("Instagram lấy tối đa 15 hashtag, kênh khác tối đa 5", () => {
    const manyHashtags = Array.from({ length: 20 }, (_, i) => `#tag${i}`)
    const input: BuildContentBriefInput = { ...baseInput, shop: { ...baseInput.shop, hashtags: manyHashtags } }
    const brief = buildContentBrief(input)
    expect(buildFallbackPost(brief, "instagram").hashtags.length).toBe(15)
    expect(buildFallbackPost(brief, "facebook").hashtags.length).toBe(5)
  })

  it("factIds không trùng lặp", () => {
    const brief = buildContentBrief(baseInput)
    const post = buildFallbackPost(brief, "facebook")
    expect(new Set(post.factIds).size).toBe(post.factIds.length)
  })
})
