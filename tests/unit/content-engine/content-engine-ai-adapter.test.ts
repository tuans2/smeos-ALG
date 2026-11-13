import { describe, expect, it, vi } from "vitest"

import type { AiModelCandidate } from "@/core/ai/domain/routing"
import type { LLMProvider, LLMResponse } from "@/core/ports/llm-provider"
import { AGENT_CALL_TIMEOUT_MS } from "@/modules/content-engine/domain/pipeline-rules"

import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"
import {
  createCriticAdapter,
  createRewriterAdapter,
  createStrategistAdapter,
  createWriterAdapter,
} from "@/modules/content-engine/adapters/content-engine-ai-adapter"

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

const model: AiModelCandidate = {
  key: "gpt-test",
  provider: "openai",
  enabled: true,
  measureState: "SAN_XUAT",
  leavesInfra: false,
  qualityClass: "trung_binh",
  costClass: "trung_binh",
  latencyClass: "trung_binh",
  capabilities: ["AIC-23", "AIC-24", "AIC-37"],
  licenseComplete: true,
}

function fakeLlm(text: string, extra: Partial<LLMResponse> = {}): LLMProvider {
  const complete = vi.fn(
    async (): Promise<LLMResponse> => ({ text, model: "gpt-test", modelVersion: "1", costUsd: 0.01, inputTokens: 100, outputTokens: 50, ...extra })
  )
  return { name: "fake", complete }
}

describe("content-engine-ai-adapter", () => {
  it("createStrategistAdapter: gọi LLM, chuẩn hoá chiến lược, trả điểm factual/brand", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(
      JSON.stringify({
        core_message: "Hoa hồng đỏ cho ngày đặc biệt",
        channels: [{ channel: "facebook", angle: "a", outline: "o", hooks: ["h"], fact_ids: ["f1"], cta: "c" }],
      })
    )
    const run = createStrategistAdapter(llm, brief, ["facebook"], "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.output.coreMessage).toBe("Hoa hồng đỏ cho ngày đặc biệt")
      expect(outcome.scores).toEqual({ factual: 1, brand: 1 })
      expect(outcome.costUsd).toBe(0.01)
    }
  })

  it("mọi agent gửi thời hạn chờ AGENT_CALL_TIMEOUT_MS cho LLM (không treo request theo nhà cung cấp)", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(
      JSON.stringify({
        core_message: "m",
        channels: [{ channel: "facebook", angle: "a", outline: "o", hooks: ["h"], fact_ids: ["f1"], cta: "c" }],
      })
    )
    await createStrategistAdapter(llm, brief, ["facebook"], "org_1")(model)
    expect(llm.complete).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: AGENT_CALL_TIMEOUT_MS }))
  })

  it("createStrategistAdapter: JSON hỏng → ok:false, không ném lỗi", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm("không phải JSON")
    const run = createStrategistAdapter(llm, brief, ["facebook"], "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(false)
  })

  it("createWriterAdapter: gọi LLM, chuẩn hoá bài viết", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(JSON.stringify({ text: "Bài viết mẫu đủ dài để qua kiểm tra", hashtags: ["hoatuoi"], fact_ids: ["f1"] }))
    const run = createWriterAdapter(llm, { brief, channel: "facebook", strategy: null }, "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.output.text).toContain("Bài viết mẫu")
      expect(outcome.output.hashtags).toEqual(["#hoatuoi"])
      expect(outcome.scores?.factual).toBe(1)
    }
  })

  it("createWriterAdapter: normalize thất bại (bài quá ngắn) → ok:false", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(JSON.stringify({ text: "ngắn" }))
    const run = createWriterAdapter(llm, { brief, channel: "facebook", strategy: null }, "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(false)
  })

  it("createCriticAdapter: gọi LLM, trả điểm mỗi kênh trong output", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(
      JSON.stringify({ channels: [{ channel: "facebook", scores: { factual: 0.9, brand: 1 }, issues: [], fix_instructions: "" }] })
    )
    const posts = [{ channel: "facebook" as const, text: "Bài Facebook mẫu", hashtags: ["#hoatuoi"] }]
    const run = createCriticAdapter(llm, brief, posts, "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.output.channels[0]?.scores.factual).toBe(0.9)
      expect(outcome.scores).toEqual({ factual: 1, brand: 1, platform: 1 })
    }
  })

  it("createCriticAdapter: brief có kịch bản thì scores của cổng gồm cả story", async () => {
    const input: BuildContentBriefInput = {
      ...baseInput,
      story: { scenePlanId: "s1", mode: "AUTHENTIC", logline: "l", emotionalTone: "e", hook: "h", cta: "c", sceneLines: ["l1"] },
    }
    const brief = buildContentBrief(input)
    const llm = fakeLlm(JSON.stringify({ channels: [{ channel: "facebook", scores: { factual: 1 } }] }))
    const posts = [{ channel: "facebook" as const, text: "Bài Facebook mẫu", hashtags: [] }]
    const run = createCriticAdapter(llm, brief, posts, "org_1")
    const outcome = await run(model)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.scores).toEqual({ factual: 1, brand: 1, platform: 1, story: 1 })
  })

  it("createRewriterAdapter: gọi LLM, chuẩn hoá bài viết lại", async () => {
    const brief = buildContentBrief(baseInput)
    const llm = fakeLlm(JSON.stringify({ text: "Bài viết lại đủ dài để qua kiểm tra", hashtags: [], fact_ids: [] }))
    const run = createRewriterAdapter(
      llm,
      { brief, channel: "facebook", previousText: "cũ", previousHashtags: [], issues: ["lỗi 1"], fixInstructions: "sửa" },
      "org_1"
    )
    const outcome = await run(model)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.output.text).toContain("Bài viết lại")
  })
})
