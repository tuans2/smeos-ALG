import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { WRITER_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/writer/v1"
import type { StrategyChannelPlan } from "@/modules/content-engine/domain/prompts/strategist/v1"

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
  passport: { sellingPoints: ["Hoa nhập khẩu tuyển chọn"], flowerMeaningStory: "Hoa hồng đỏ tượng trưng cho tình yêu.", occasions: ["sinh nhật"] },
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

const strategy: StrategyChannelPlan = {
  channel: "facebook",
  angle: "Kể chuyện tặng hoa",
  hooks: ["Hôm nay là ngày đặc biệt"],
  outline: "Mở bài rồi CTA",
  factIds: ["f1"],
  cta: "Nhắn tin ngay",
}

describe("WRITER_PROMPT_V1", () => {
  it("id/version cố định", () => {
    expect(WRITER_PROMPT_V1.id).toBe("writer")
    expect(WRITER_PROMPT_V1.version).toBe("v1")
  })

  it("build: có chiến lược thì nhắc góc/hook/outline/cta của Strategist", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = WRITER_PROMPT_V1.build({ brief, channel: "facebook", strategy })
    expect(prompt).toContain("Kể chuyện tặng hoa")
    expect(prompt).toContain("Hôm nay là ngày đặc biệt")
    expect(prompt).toContain("Mở bài rồi CTA")
  })

  it("build: không có chiến lược (Strategist hỏng) vẫn ra prompt hợp lệ, không nhắc chiến lược", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = WRITER_PROMPT_V1.build({ brief, channel: "facebook", strategy: null })
    expect(prompt).not.toContain("CHIẾN LƯỢC CHO KÊNH NÀY")
    expect(prompt).toContain(brief.product.name)
  })

  it("normalize: đầu ra hợp lệ được chuẩn hoá, hashtag thêm # nếu thiếu", () => {
    const result = WRITER_PROMPT_V1.normalize({ text: "Bài viết mẫu đủ dài để qua kiểm tra", hashtags: ["hoatuoi", "#quatang"], fact_ids: ["f1", "f1"] }, "facebook")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.output.hashtags).toEqual(["#hoatuoi", "#quatang"])
      expect(result.output.factIds).toEqual(["f1"])
    }
  })

  it("normalize: bài quá ngắn → lỗi", () => {
    expect(WRITER_PROMPT_V1.normalize({ text: "ngắn" }, "facebook").ok).toBe(false)
  })

  it("normalize: cắt hashtag theo trần của kênh (instagram)", () => {
    const many = Array.from({ length: 40 }, (_, i) => `tag${i}`)
    const result = WRITER_PROMPT_V1.normalize({ text: "Bài viết mẫu đủ dài để qua kiểm tra", hashtags: many }, "instagram")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.output.hashtags.length).toBeLessThanOrEqual(30)
  })
})
