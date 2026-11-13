import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import { buildContentBrief, type BuildContentBriefInput } from "@/modules/content-engine/domain/brief-builder"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

const startInline = vi.fn()
const finishInline = vi.fn()
const setStage = vi.fn()
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { startInline, finishInline, setStage } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})
vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({ enqueueJob: vi.fn() }))
vi.mock("@/modules/usage/use-cases/refund-job", () => ({ refundJob: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: vi.fn() }))
vi.mock("@/core/ai/adapters/openai-llm-provider", () => ({ OpenAILLMProvider: vi.fn() }))
vi.mock("@/modules/content-engine/use-cases/get-content-brief", () => ({ getContentBrief: vi.fn() }))

const createGeneration = vi.fn()
const findByIdGeneration = vi.fn()
vi.mock("@/modules/content-engine/infra/content-generation-repository", () => {
  const mocked = {
    ContentGenerationRepository: vi.fn().mockImplementation(function () { return { create: createGeneration, findById: findByIdGeneration } }),
  }
  return { ...mocked, getContentGenerationRepository: vi.fn(() => new mocked.ContentGenerationRepository()) }
})

import { callCapability } from "@/core/ai/gateway"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { getContentBrief } from "@/modules/content-engine/use-cases/get-content-brief"
import { dedupedStatus, generateContent } from "@/modules/content-engine/use-cases/generate-content"

const briefInput: BuildContentBriefInput = {
  organizationId: "org-1",
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
const brief = buildContentBrief(briefInput)

const job = { id: "job-1", status: "PENDING", error: null, output: null }

/** Hàng đợi phản hồi theo `capability` — mô phỏng cổng AI mà không chạy adapter thật. */
function mockGateway(queues: Record<string, unknown[]>) {
  vi.mocked(callCapability).mockImplementation(async (req: { capability: string }) => {
    const q = queues[req.capability]
    if (!q || q.length === 0) throw new Error(`Không có phản hồi mock cho ${req.capability}`)
    return q.shift() as never
  })
}

const okWriter = (text: string, hashtags: string[] = ["#hoatuoi"]) => ({ kind: "xong", output: { text, hashtags, factIds: ["f1"] } })
const failCall = { kind: "khong_chay_duoc", reason: "KHONG_CO_MO_HINH_DU_DIEU_KIEN" }

describe("generateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(refundJob).mockResolvedValue(undefined as never)
    vi.mocked(getContentBrief).mockResolvedValue(brief)
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 2, balanceAfter: 8 } } as never)
    createGeneration.mockResolvedValue({ id: "gen-1", overall_score: null, posts: [] })
  })

  it("chuỗi thành công đầy đủ: Strategist → Writer → Critic đạt ngưỡng, không viết lại", async () => {
    mockGateway({
      content_strategy: [
        { kind: "xong", output: { coreMessage: "cm", channels: [{ channel: "facebook", angle: "a", hooks: [], outline: "o", factIds: [], cta: "c" }] } },
      ],
      content_generation: [okWriter("Bài Facebook đủ dài để qua kiểm tra độ dài tối thiểu của kênh này nhé"), okWriter("Bài Instagram")],
      content_qa: [
        {
          kind: "xong",
          output: {
            channels: [
              { channel: "facebook", scores: { factual: 1, brand: 1, platform: 1, readability: 1 }, issues: [], fixInstructions: "" },
              { channel: "instagram", scores: { factual: 1, brand: 1, platform: 1, readability: 1 }, issues: [], fixInstructions: "" },
            ],
          },
        },
      ],
    })

    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k1" })

    expect(r.status).toBe("COMPLETED")
    expect(r.posts).toHaveLength(2)
    expect(r.posts.every((p) => p.source === "ai")).toBe(true)
    expect(r.posts.every((p) => !p.needsReview)).toBe(true)
    expect(r.overallScore).toBeCloseTo(1, 5)
    expect(createGeneration).toHaveBeenCalledTimes(1)
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: true }))
    expect(setStage).toHaveBeenCalledWith(ctx, "job-1", "STRATEGIST")
    expect(setStage).toHaveBeenCalledWith(ctx, "job-1", "WRITER")
    expect(setStage).toHaveBeenCalledWith(ctx, "job-1", "CRITIC")
    expect(setStage).not.toHaveBeenCalledWith(ctx, "job-1", "REWRITER")
  })

  it("Strategist hỏng: Writer vẫn viết được (viết thẳng từ brief), chuỗi vẫn hoàn tất", async () => {
    mockGateway({
      content_strategy: [failCall],
      content_generation: [okWriter("Bài Facebook đủ dài để qua kiểm tra độ dài tối thiểu của kênh này nhé"), okWriter("Bài Instagram")],
      content_qa: [{ kind: "xong", output: { channels: [
        { channel: "facebook", scores: { factual: 1, brand: 1, platform: 1, readability: 1 } },
        { channel: "instagram", scores: { factual: 1, brand: 1, platform: 1, readability: 1 } },
      ] } }],
    })

    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k2" })
    expect(r.status).toBe("COMPLETED")
    expect(r.posts.every((p) => p.source === "ai")).toBe(true)
  })

  it("Critic hỏng: chỉ dùng kiểm tất định, bài sạch thì không viết lại và không tính vào điểm tổng", async () => {
    mockGateway({
      content_strategy: [failCall],
      content_generation: [okWriter("Bài Facebook đủ dài để qua kiểm tra độ dài tối thiểu của kênh này nhé"), okWriter("Bài Instagram")],
      content_qa: [failCall],
    })

    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k3" })
    expect(r.status).toBe("COMPLETED")
    expect(r.posts.every((p) => p.scores === null)).toBe(true)
    expect(r.posts.every((p) => !p.needsReview)).toBe(true)
    expect(r.overallScore).toBe(0)
  })

  it("Writer hỏng hẳn cho một kênh: dùng khuôn tất định (template), đánh dấu needsReview", async () => {
    mockGateway({
      content_strategy: [failCall],
      content_generation: [failCall, okWriter("Bài Instagram")],
      content_qa: [{ kind: "xong", output: { channels: [{ channel: "instagram", scores: { factual: 1, brand: 1, platform: 1, readability: 1 } }] } }],
    })

    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k4" })
    const fb = r.posts.find((p) => p.channel === "facebook")
    expect(fb?.source).toBe("template")
    expect(fb?.needsReview).toBe(true)
    expect(fb?.text).toContain(brief.product.name)
  })

  it("Critic chấm thấp: gọi Rewriter, thành công thì source rewritten và không cần soát", async () => {
    mockGateway({
      content_strategy: [failCall],
      content_generation: [
        okWriter("Bài Facebook đủ dài để qua kiểm tra độ dài tối thiểu của kênh này nhé"),
        okWriter("Bài Instagram bản đầu chưa tốt lắm"),
        okWriter("Bài viết lại tốt hơn nhiều so với bản cũ"),
      ],
      content_qa: [{ kind: "xong", output: { channels: [
        { channel: "facebook", scores: { factual: 1, brand: 1, platform: 1, readability: 1 } },
        { channel: "instagram", scores: { factual: 0.1, brand: 0.1, platform: 0.1, readability: 0.1 }, issues: ["quá tệ"], fixInstructions: "viết lại hết" },
      ] } }],
    })

    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k5" })
    const ig = r.posts.find((p) => p.channel === "instagram")
    expect(ig?.source).toBe("rewritten")
    expect(callCapability).toHaveBeenCalled()
    expect(setStage).toHaveBeenCalledWith(ctx, "job-1", "REWRITER")
  })

  it("trùng khoá idempotency: trả lại bản ghi cũ, không gọi cổng AI", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({
      job: { ...job, status: "COMPLETED", output: { generation_id: "gen-old" } },
      deduped: true,
      usage: { costCredit: 0, balanceAfter: null },
    } as never)
    findByIdGeneration.mockResolvedValue({ id: "gen-old", overall_score: 0.9, posts: [{ channel: "facebook", needsReview: false }] })

    const r = await generateContent(ctx, { channels: ["facebook"], idempotencyKey: "k1" })
    expect(callCapability).not.toHaveBeenCalled()
    expect(r.deduped).toBe(true)
    expect(r.generationId).toBe("gen-old")
  })

  it("cả chuỗi hỏng (Strategist + Writer + Critic đều hỏng): vẫn hoàn tất bằng khuôn tất định, không FAILED", async () => {
    mockGateway({ content_strategy: [failCall], content_generation: [failCall, failCall], content_qa: [failCall] })
    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k6" })
    expect(r.status).toBe("COMPLETED")
    expect(r.posts.every((p) => p.source === "template" && p.needsReview)).toBe(true)
    // Không thu credit cho bài AI không viết: COMPLETED + result=REJECTED rồi hoàn.
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: true, result: "REJECTED" }))
    expect(refundJob).toHaveBeenCalledWith(ctx, "job-1")
  })

  it("hoàn được credit khi cả chuỗi hỏng: usage trả về cost_credit 0", async () => {
    vi.mocked(refundJob).mockResolvedValue({ refunded: true, creditHoanLai: 2, lyDo: "guard-tu-choi" })
    mockGateway({ content_strategy: [failCall], content_generation: [failCall], content_qa: [failCall] })
    const r = await generateContent(ctx, { channels: ["facebook"], idempotencyKey: "k6b" })
    expect(r.usage).toEqual({ costCredit: 0, balanceAfter: null })
  })

  it("chỉ một kênh rơi về khuôn: vẫn thu credit, không hoàn", async () => {
    mockGateway({
      content_strategy: [failCall],
      content_generation: [failCall, okWriter("Bài Instagram")],
      content_qa: [failCall],
    })
    const r = await generateContent(ctx, { channels: ["facebook", "instagram"], idempotencyKey: "k6c" })
    expect(r.usage).toEqual({ costCredit: 2, balanceAfter: 8 })
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.not.objectContaining({ result: "REJECTED" }))
    expect(refundJob).not.toHaveBeenCalled()
  })

  it("trùng khoá khi lượt đầu còn đang chạy: PROCESSING, không phải FAILED", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({
      job: { id: "job-run", status: "PROCESSING", output: null },
      deduped: true,
      usage: { costCredit: 2, balanceAfter: 8 },
    } as never)
    const r = await generateContent(ctx, { channels: ["facebook"], idempotencyKey: "k-run" })
    expect(r).toMatchObject({ jobId: "job-run", status: "PROCESSING", deduped: true, posts: [] })
    expect(callCapability).not.toHaveBeenCalled()
  })

  it("lỗi bất ngờ trong lúc dựng brief: job FAILED và hoàn credit", async () => {
    vi.mocked(getContentBrief).mockRejectedValue(new Error("Không tìm thấy sản phẩm"))
    vi.mocked(refundJob).mockResolvedValueOnce({ refunded: true, creditHoanLai: 2, lyDo: "loi-ky-thuat" })
    // Audit BL-33: câu cố định tiếng Việt, chỉ nói "đã hoàn" khi hoàn thật, không lộ lỗi gốc
    await expect(generateContent(ctx, { channels: ["facebook"], idempotencyKey: "k7" })).rejects.toThrow("AI chưa viết được bài — đã hoàn credit, vui lòng thử lại.")
    vi.mocked(getContentBrief).mockRejectedValue(new Error("Không tìm thấy sản phẩm"))
    await expect(generateContent(ctx, { channels: ["facebook"], idempotencyKey: "k7b" })).rejects.toThrow(/credit sẽ được hoàn tự động/)
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: false }))
    expect(refundJob).toHaveBeenCalledWith(ctx, "job-1")
  })

  it("thiếu năng lực I1 thì từ chối trước khi tạo job", async () => {
    await expect(generateContent({ ...ctx, capabilities: new Set() }, { channels: ["facebook"], idempotencyKey: "k8" })).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("không có kênh nào: từ chối trước khi tạo job", async () => {
    await expect(generateContent(ctx, { channels: [], idempotencyKey: "k9" })).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })
})

describe("dedupedStatus", () => {
  it("PENDING/PROCESSING → PROCESSING; COMPLETED giữ nguyên; còn lại FAILED", () => {
    expect(dedupedStatus("PENDING")).toBe("PROCESSING")
    expect(dedupedStatus("PROCESSING")).toBe("PROCESSING")
    expect(dedupedStatus("COMPLETED")).toBe("COMPLETED")
    expect(dedupedStatus("FAILED")).toBe("FAILED")
    expect(dedupedStatus("CANCELLED")).toBe("FAILED")
  })
})
