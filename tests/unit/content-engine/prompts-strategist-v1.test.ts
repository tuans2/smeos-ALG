import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { STRATEGIST_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/strategist/v1"

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

describe("STRATEGIST_PROMPT_V1", () => {
  it("id/version cố định", () => {
    expect(STRATEGIST_PROMPT_V1.id).toBe("strategist")
    expect(STRATEGIST_PROMPT_V1.version).toBe("v1")
  })

  it("build: prompt nhắc đủ sản phẩm, chủ đề, facts, các kênh yêu cầu", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = STRATEGIST_PROMPT_V1.build(brief, ["facebook", "instagram"])
    expect(prompt).toContain(brief.product.name)
    expect(prompt).toContain(brief.topic.title)
    expect(prompt).toContain("facebook")
    expect(prompt).toContain("instagram")
    for (const f of brief.facts) expect(prompt).toContain(f.factId)
  })

  it("jsonSchema: có core_message và channels bắt buộc", () => {
    const schema = STRATEGIST_PROMPT_V1.jsonSchema() as { required?: string[] }
    expect(schema.required).toEqual(["core_message", "channels"])
  })

  it("normalize: đầu ra hợp lệ được chuẩn hoá đúng", () => {
    const raw = {
      core_message: "Hoa hồng đỏ cho ngày đặc biệt",
      channels: [
        { channel: "facebook", angle: "Kể chuyện tặng hoa", outline: "Mở bài rồi CTA", hooks: ["Hôm nay là ngày đặc biệt"], fact_ids: ["f1"], cta: "Nhắn tin ngay" },
        { channel: "zalo", angle: "sai kênh, không có trong expected", outline: "..." },
      ],
    }
    const result = STRATEGIST_PROMPT_V1.normalize(raw, ["facebook", "instagram"])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.strategy.coreMessage).toBe("Hoa hồng đỏ cho ngày đặc biệt")
      expect(result.strategy.channels).toHaveLength(1)
      expect(result.strategy.channels[0]?.channel).toBe("facebook")
    }
  })

  it("normalize: thiếu core_message → lỗi", () => {
    const result = STRATEGIST_PROMPT_V1.normalize({ channels: [] }, ["facebook"])
    expect(result.ok).toBe(false)
  })

  it("normalize: không có kênh hợp lệ nào → lỗi", () => {
    const result = STRATEGIST_PROMPT_V1.normalize(
      { core_message: "x", channels: [{ channel: "tiktok", angle: "a", outline: "o" }] },
      ["facebook", "instagram"]
    )
    expect(result.ok).toBe(false)
  })

  it("normalize: raw không phải object → lỗi", () => {
    expect(STRATEGIST_PROMPT_V1.normalize(null, ["facebook"]).ok).toBe(false)
    expect(STRATEGIST_PROMPT_V1.normalize("chuỗi", ["facebook"]).ok).toBe(false)
  })
})
