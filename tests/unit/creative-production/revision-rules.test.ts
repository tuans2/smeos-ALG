import { describe, expect, it } from "vitest"

import {
  buildContentRewritePrompt,
  buildSceneRevisePrompt,
  normalizeRevisedScene,
  normalizeRewrite,
} from "@/modules/creative-production/domain/revision-rules"
import { buildRuleScenePlan } from "@/modules/creative-production/domain/scene-plan-rules"

const plan = buildRuleScenePlan({
  mode: "CREATIVE",
  productName: "Giỏ hoa khai trương",
  colors: ["đỏ"],
  components: [],
  occasions: ["Khai trương"],
  topic: { id: "t", title: "Bó hoa khai trương tone đỏ" },
})
const scene = plan.scenes[1]!

describe("revision-rules — sửa tại chỗ ở Chặng 07", () => {
  it("lời nhắc sửa cảnh mang đúng yêu cầu và cảnh hiện tại", () => {
    const p = buildSceneRevisePrompt({
      instruction: "đổi sang quầy lễ tân tông vàng ấm",
      scene,
      mode: "CREATIVE",
      topicTitle: plan.topicTitle,
      productName: "Giỏ hoa",
      colors: ["đỏ"],
    })
    expect(p).toContain("quầy lễ tân tông vàng ấm")
    expect(p).toContain(scene.setting)
  })

  it("cảnh sửa giữ trường thiếu, lọc chữ hoa/người khỏi lời nhắc hậu cảnh", () => {
    const r = normalizeRevisedScene(
      {
        setting: "Quầy lễ tân khách sạn tông vàng ấm",
        background_prompt: "a warm golden hotel reception counter with a bouquet of flowers, soft light",
        local_backdrop: "luxury_hotel",
      },
      scene
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.scene.setting).toContain("lễ tân")
    expect(r.scene.backgroundPrompt).not.toMatch(/bouquet|flowers/i)
    expect(r.scene.voiceScript).toBe(scene.voiceScript)
    expect(r.scene.sceneIndex).toBe(scene.sceneIndex)
  })

  it("cảnh sửa thiếu bối cảnh thì loại cả lượt", () => {
    expect(normalizeRevisedScene({ background_prompt: "x" }, scene).ok).toBe(false)
  })

  it("viết lại bài: cắt theo giới hạn kênh, chuẩn hashtag, giữ hashtag cũ khi mô hình không trả", () => {
    const input = {
      channel: "zalo" as const,
      text: "Bài cũ",
      hashtags: ["#hoa"],
      instruction: "vui hơn",
      productName: "Giỏ hoa",
      topicTitle: "Khai trương",
    }
    expect(buildContentRewritePrompt(input)).toContain("vui hơn")
    const r = normalizeRewrite({ text: "Chúc mừng khai trương! ".repeat(200), hashtags: ["hoatuoi", "#khai truong"] }, input)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.text.length).toBeLessThanOrEqual(2000)
    expect(r.hashtags).toEqual(["#hoatuoi", "#khaitruong"])
    const r2 = normalizeRewrite({ text: "Một bài viết đủ dài để hợp lệ." }, input)
    expect(r2.ok && r2.hashtags).toEqual(["#hoa"])
  })

  it("bài viết lại trống bị loại", () => {
    expect(
      normalizeRewrite({ text: "" }, { channel: "facebook", text: "", hashtags: [], instruction: "x", productName: "", topicTitle: "" }).ok
    ).toBe(false)
  })
})
