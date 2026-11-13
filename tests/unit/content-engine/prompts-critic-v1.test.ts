import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { CRITIC_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/critic/v1"

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

const posts = [
  { channel: "facebook" as const, text: "Bài Facebook mẫu", hashtags: ["#hoatuoi"] },
  { channel: "instagram" as const, text: "Bài Instagram mẫu", hashtags: ["#hoatuoi", "#quatang"] },
]

describe("CRITIC_PROMPT_V1", () => {
  it("id/version cố định", () => {
    expect(CRITIC_PROMPT_V1.id).toBe("critic")
    expect(CRITIC_PROMPT_V1.version).toBe("v1")
  })

  it("build: liệt kê đủ các bài cần chấm và tiêu chí, bỏ 'story' khi brief không có kịch bản", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = CRITIC_PROMPT_V1.build(brief, posts)
    expect(prompt).toContain("Bài Facebook mẫu")
    expect(prompt).toContain("Bài Instagram mẫu")
    expect(prompt).toContain("factual:")
    expect(prompt).not.toContain("story:")
  })

  it("build: có kịch bản thì thêm tiêu chí story", () => {
    const input: BuildContentBriefInput = {
      ...baseInput,
      story: { scenePlanId: "s1", mode: "AUTHENTIC", logline: "abc", emotionalTone: "ấm", hook: "h", cta: "c", sceneLines: ["l1"] },
    }
    const brief = buildContentBrief(input)
    const prompt = CRITIC_PROMPT_V1.build(brief, posts)
    expect(prompt).toContain("story:")
  })

  it("normalize: đầu ra hợp lệ chuẩn hoá đúng, kẹp điểm về 0..1", () => {
    const raw = {
      channels: [
        { channel: "facebook", scores: { factual: 1.5, brand: 0.5 }, issues: ["lặp câu"], fix_instructions: "sửa câu mở" },
        { channel: "tiktok", scores: { factual: 1 } }, // kênh không nằm trong expected -> bị loại
      ],
    }
    const result = CRITIC_PROMPT_V1.normalize(raw, ["facebook", "instagram"])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.output.channels).toHaveLength(1)
      expect(result.output.channels[0]?.scores.factual).toBe(1)
      expect(result.output.channels[0]?.fixInstructions).toBe("sửa câu mở")
    }
  })

  it("normalize: không chấm được kênh nào → lỗi", () => {
    const result = CRITIC_PROMPT_V1.normalize({ channels: [] }, ["facebook"])
    expect(result.ok).toBe(false)
  })

  it("normalize: raw không phải object → lỗi", () => {
    expect(CRITIC_PROMPT_V1.normalize(null, ["facebook"]).ok).toBe(false)
  })
})
