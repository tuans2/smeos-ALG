import { describe, expect, it } from "vitest"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import {
  formatBannedNotice,
  formatFactsForPrompt,
  formatShopForPrompt,
  formatStoryForPrompt,
} from "@/modules/content-engine/domain/prompts/format-brief"

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
    forbiddenStyles: ["giá rẻ nhất thị trường"],
  },
  channels: ["facebook", "instagram"],
}

describe("format-brief", () => {
  it("formatFactsForPrompt: liệt kê fact_id + category + text, không lộ product/passport thô", () => {
    const brief = buildContentBrief(baseInput)
    const rendered = formatFactsForPrompt(brief)
    for (const f of brief.facts) {
      expect(rendered).toContain(`[${f.factId}]`)
      expect(rendered).toContain(f.category)
      expect(rendered).toContain(f.text)
    }
  })

  it("formatShopForPrompt: gồm tên tiệm, giọng văn, hashtag, CTA khi có", () => {
    const brief = buildContentBrief(baseInput)
    const rendered = formatShopForPrompt(brief)
    expect(rendered).toContain("SiiN Store")
    expect(rendered).toContain("thân thiện")
    expect(rendered).toContain("#hoatuoi")
    expect(rendered).toContain("Nhắn tin tiệm nhé!")
  })

  it("formatShopForPrompt: bỏ qua dòng khi thiếu giọng văn/CTA/hashtag", () => {
    const input: BuildContentBriefInput = {
      ...baseInput,
      shop: { ...baseInput.shop, toneOfVoice: null, ctaPhrase: null, hashtags: [] },
    }
    const brief = buildContentBrief(input)
    const rendered = formatShopForPrompt(brief)
    expect(rendered).not.toContain("Giọng văn:")
    expect(rendered).not.toContain("CTA mặc định:")
    expect(rendered).not.toContain("Hashtag thường dùng:")
  })

  it("formatStoryForPrompt: trả null khi brief không có kịch bản", () => {
    const brief = buildContentBrief(baseInput)
    expect(formatStoryForPrompt(brief)).toBeNull()
  })

  it("formatStoryForPrompt: render logline/hook/cta/sceneLines khi có kịch bản", () => {
    const input: BuildContentBriefInput = {
      ...baseInput,
      story: {
        scenePlanId: "scene_1",
        mode: "AUTHENTIC",
        logline: "Một buổi sáng tặng hoa cho mẹ",
        emotionalTone: "ấm áp",
        hook: "Mẹ ơi, con có quà",
        cta: "Đặt hoa tặng mẹ ngay",
        sceneLines: ["Cảnh 1: mở hộp hoa", "Cảnh 2: trao hoa"],
      },
    }
    const brief = buildContentBrief(input)
    const rendered = formatStoryForPrompt(brief)
    expect(rendered).not.toBeNull()
    expect(rendered).toContain("Một buổi sáng tặng hoa cho mẹ")
    expect(rendered).toContain("ấm áp")
    expect(rendered).toContain("Mẹ ơi, con có quà")
    expect(rendered).toContain("Đặt hoa tặng mẹ ngay")
    expect(rendered).toContain("Cảnh 1: mở hộp hoa")
  })

  it("formatBannedNotice: gồm thông báo chỉ nói facts + phong cách cấm của tiệm", () => {
    const brief = buildContentBrief(baseInput)
    const rendered = formatBannedNotice(brief)
    expect(rendered).toContain("Chỉ được nói những gì có trong facts[]")
    expect(rendered).toContain("giá rẻ nhất thị trường")
  })

  it("formatBannedNotice: không có phong cách cấm nào thì ghi rõ (không có)", () => {
    const input: BuildContentBriefInput = { ...baseInput, shop: { ...baseInput.shop, forbiddenStyles: [] } }
    const brief = buildContentBrief(input)
    expect(formatBannedNotice(brief)).toContain("(không có)")
  })
})
