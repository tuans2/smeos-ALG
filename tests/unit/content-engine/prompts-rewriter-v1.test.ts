import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import { REWRITER_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/rewriter/v1"

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

describe("REWRITER_PROMPT_V1", () => {
  it("id/version cố định", () => {
    expect(REWRITER_PROMPT_V1.id).toBe("rewriter")
    expect(REWRITER_PROMPT_V1.version).toBe("v1")
  })

  it("build: nhắc bài cũ, lỗi cần sửa, hướng dẫn sửa", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = REWRITER_PROMPT_V1.build({
      brief,
      channel: "facebook",
      previousText: "Bài cũ có lỗi",
      previousHashtags: ["#hoatuoi"],
      issues: ["nói giá không có trong facts"],
      fixInstructions: "Bỏ câu nói giá",
    })
    expect(prompt).toContain("Bài cũ có lỗi")
    expect(prompt).toContain("nói giá không có trong facts")
    expect(prompt).toContain("Bỏ câu nói giá")
  })

  it("build: không có issues cụ thể vẫn ra prompt hợp lệ", () => {
    const brief = buildContentBrief(baseInput)
    const prompt = REWRITER_PROMPT_V1.build({
      brief,
      channel: "facebook",
      previousText: "Bài cũ",
      previousHashtags: [],
      issues: [],
      fixInstructions: "",
    })
    expect(prompt).toContain("không có lỗi cụ thể")
  })

  it("normalize: cùng hình dạng với Writer, cắt theo trần kênh", () => {
    const result = REWRITER_PROMPT_V1.normalize({ text: "Bài viết lại đủ dài để qua kiểm tra", hashtags: ["hoatuoi"], fact_ids: ["f1"] }, "facebook")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.output.hashtags).toEqual(["#hoatuoi"])
      expect(result.output.factIds).toEqual(["f1"])
    }
  })

  it("normalize: bài quá ngắn → lỗi", () => {
    expect(REWRITER_PROMPT_V1.normalize({ text: "ok" }, "facebook").ok).toBe(false)
  })
})
