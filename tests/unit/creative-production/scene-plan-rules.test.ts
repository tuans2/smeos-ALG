import { describe, expect, it } from "vitest"

import {
  buildRuleScenePlan,
  buildScenePlanPrompt,
  inferLocalBackdrop,
  normalizeAiScenePlan,
  parseStoredScenePlan,
  sanitizeBackgroundPrompt,
  sceneCountFor,
  scenePlanKey,
  type ScenePlanInput,
} from "@/modules/creative-production/domain/scene-plan-rules"
import { MAX_SCENE_PROMPT_LENGTH, NARRATIVE_SCENE_INDEXES } from "@/modules/media/domain/variant-rules"

const INPUT: ScenePlanInput = {
  mode: "CREATIVE",
  productName: "Bó hoa xanh pastel",
  category: "Bó tròn tự nhiên",
  style: "Hiện đại Hàn Quốc",
  colors: ["xanh pastel", "trắng"],
  components: ["Cẩm tú cầu"],
  occasions: ["Sinh nhật"],
  topic: {
    id: "t-1",
    title: "Bó hoa sinh nhật 550K cho người thích tone màu vàng",
    angleCategory: "PRODUCT_SHOWCASE",
    hook: "Sinh nhật bạn thân mà chưa biết tặng gì?",
    cta: "Nhắn tiệm để giữ bó hoa",
  },
}

function aiScene(beat: string, i: number) {
  return {
    beat,
    title: `Cảnh ${i}`,
    setting: `Bàn tiệc sinh nhật tông vàng số ${i}`,
    lighting: "Ánh nến ấm",
    palette: ["vàng", "kem"],
    purpose: "Facebook",
    background_prompt: "a cosy birthday table with warm yellow balloons, soft bokeh, no bouquet",
    local_backdrop: "wedding",
    voice_script: "Lời thoại",
    text_overlay: "Chữ",
    motion_effect: "zoom_in",
  }
}

describe("scene-plan-rules", () => {
  it("số cảnh theo mode: CREATIVE 5, AUTHENTIC 3 — và API biến thể nhận đủ chỉ số", () => {
    expect(sceneCountFor("CREATIVE")).toBe(5)
    expect(sceneCountFor("AUTHENTIC")).toBe(3)
    expect(NARRATIVE_SCENE_INDEXES).toContain(5)
  })

  it("lời nhắc mang đúng chủ đề, dịp và tông màu", () => {
    const prompt = buildScenePlanPrompt(INPUT)
    expect(prompt).toContain("sinh nhật 550K")
    expect(prompt).toContain("tone màu vàng")
    expect(prompt).toContain("Đúng 5 cảnh")
    expect(prompt).toContain("SETUP → RISING → CLIMAX → RESOLUTION → CTA")
  })

  it("chuẩn hoá đầu ra AI: nhịp theo mode, bỏ chữ hoa/người khỏi lời nhắc hậu cảnh", () => {
    const beats = ["CTA", "CTA", "CTA", "CTA", "CTA"] // mô hình trả sai nhịp
    const r = normalizeAiScenePlan({ emotional_tone: "Vui", scenes: beats.map(aiScene) }, INPUT)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.plan.scenes.map((s) => s.beat)).toEqual(["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"])
    expect(r.plan.scenes[0]!.backgroundPrompt).not.toMatch(/bouquet/i)
    expect(r.plan.source).toBe("ai")
    expect(r.plan.topicTitle).toBe(INPUT.topic.title)
  })

  it("loại cả lượt khi sai số cảnh hoặc thiếu bối cảnh — không vá bằng chữ mặc định", () => {
    expect(normalizeAiScenePlan({ scenes: [aiScene("SETUP", 1)] }, INPUT).ok).toBe(false)
    const thieu = ["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"].map(aiScene)
    thieu[2] = { ...thieu[2]!, setting: "" }
    expect(normalizeAiScenePlan({ scenes: thieu }, INPUT).ok).toBe(false)
  })

  it("phông cục bộ lạ thì đoán theo chữ trong bối cảnh", () => {
    const scenes = ["SETUP", "RISING", "CLIMAX", "RESOLUTION", "CTA"].map((b, i) => ({
      ...aiScene(b, i),
      local_backdrop: "rooftop",
      setting: "Sảnh khách sạn sang trọng",
    }))
    const r = normalizeAiScenePlan({ scenes }, INPUT)
    expect(r.ok && r.plan.scenes[0]!.localBackdrop).toBe("luxury_hotel")
    expect(inferLocalBackdrop("Mặt bàn gỗ tối giản")).toBe("wood_minimal")
  })

  it("lời nhắc hậu cảnh bị cắt theo giới hạn của worker", () => {
    expect(sanitizeBackgroundPrompt("a".repeat(2000)).length).toBeLessThanOrEqual(MAX_SCENE_PROMPT_LENGTH)
  })

  it("kịch bản cơ bản bám dịp + tông màu của chủ đề, không còn 'sảnh khách sạn' cho chủ đề sinh nhật", () => {
    const plan = buildRuleScenePlan(INPUT)
    expect(plan.source).toBe("rule")
    expect(plan.scenes).toHaveLength(5)
    const all = plan.scenes.map((s) => `${s.setting} ${s.backgroundPrompt}`).join(" ").toLowerCase()
    expect(all).toContain("sinh nhật")
    expect(all).toContain("yellow")
    expect(all).not.toContain("khách sạn")
    expect(buildRuleScenePlan({ ...INPUT, mode: "AUTHENTIC" }).scenes.map((s) => s.beat)).toEqual([
      "SETUP",
      "CLIMAX",
      "CTA",
    ])
  })

  it("đọc lại kịch bản đã lưu, từ chối hình dạng lạ", () => {
    const plan = buildRuleScenePlan(INPUT)
    expect(parseStoredScenePlan(JSON.parse(JSON.stringify(plan)))).not.toBeNull()
    expect(parseStoredScenePlan({ version: 99 })).toBeNull()
    expect(parseStoredScenePlan(null)).toBeNull()
  })

  it("khoá idempotency gắn ảnh + chủ đề + mode", () => {
    expect(scenePlanKey({ assetId: "a", topicId: "t", mode: "CREATIVE" })).toBe("scene-plan:a:t:CREATIVE")
  })
})
