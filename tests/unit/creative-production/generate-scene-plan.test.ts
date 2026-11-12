import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

const startInline = vi.fn()
const finishInline = vi.fn()
const findById = vi.fn()
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { startInline, finishInline, findById } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})
vi.mock("@/modules/content-engine/use-cases/generate-content", () => ({ generateContent: vi.fn() }))
vi.mock("@/modules/usage/use-cases/refund-partial", () => ({ refundPartial: vi.fn() }))
vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({ enqueueJob: vi.fn() }))
vi.mock("@/modules/usage/use-cases/refund-job", () => ({ refundJob: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: vi.fn() }))
vi.mock("@/core/ai/adapters/openai-llm-provider", () => ({ OpenAILLMProvider: vi.fn() }))

import { callCapability } from "@/core/ai/gateway"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { refundPartial } from "@/modules/usage/use-cases/refund-partial"
import { generateContent } from "@/modules/content-engine/use-cases/generate-content"
import { generateScenePlan } from "@/modules/creative-production/use-cases/generate-scene-plan"
import { buildRuleScenePlan, type ScenePlanInput } from "@/modules/creative-production/domain/scene-plan-rules"

const brief: ScenePlanInput = {
  mode: "AUTHENTIC",
  productName: "Bó hoa",
  colors: [],
  components: [],
  occasions: [],
  topic: { id: "t-1", title: "Bó hoa sinh nhật tone vàng" },
}
const plan = { ...buildRuleScenePlan(brief), source: "ai" as const }
const job = { id: "job-1", status: "PENDING", error: null, output: null }

describe("generateScenePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(refundJob).mockResolvedValue(undefined as never)
    vi.mocked(refundPartial).mockResolvedValue({ refunded: 2 })
    vi.mocked(generateContent).mockResolvedValue({ jobId: "content-1" } as never)
    findById.mockResolvedValue({ id: "content-1", status: "COMPLETED", result: null })
  })

  it("chạy qua enqueueJob + cổng AI (AIC-18) và ghi kịch bản vào output của job", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: plan } as never)

    const r = await generateScenePlan(ctx, { brief, idempotencyKey: "k" })

    expect(vi.mocked(enqueueJob).mock.calls[0]![1]).toMatchObject({ feature: "creative.scene_plan", idempotencyKey: "k" })
    expect(vi.mocked(callCapability).mock.calls[0]![0]).toMatchObject({ capability: "video_storyboard", jobId: "job-1" })
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: true, output: plan }))
    expect(r).toMatchObject({ status: "COMPLETED", deduped: false, plan })
  })

  it("trùng khoá: trả kịch bản cũ, không gọi mô hình", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({
      job: { ...job, status: "COMPLETED", output: plan },
      deduped: true,
      usage: { costCredit: 0, balanceAfter: null },
    } as never)
    const r = await generateScenePlan(ctx, { brief, idempotencyKey: "k" })
    expect(callCapability).not.toHaveBeenCalled()
    expect(r.plan?.scenes).toHaveLength(3)
    expect(r.deduped).toBe(true)
  })

  it("AI hỏng: job FAILED và hoàn credit", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "khong_chay_duoc", reason: "KHONG_CO_MO_HINH_DU_DIEU_KIEN" } as never)
    vi.mocked(refundJob).mockResolvedValueOnce({ refunded: true, creditHoanLai: 1, lyDo: "loi-ky-thuat" })
    await expect(generateScenePlan(ctx, { brief, idempotencyKey: "k" })).rejects.toThrow("AI chưa viết được kịch bản bối cảnh — đã hoàn credit, vui lòng thử lại.")
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: false }))
    expect(refundJob).toHaveBeenCalledWith(ctx, "job-1")
  })

  it("thiếu năng lực I1 thì từ chối trước khi tạo job", async () => {
    await expect(
      generateScenePlan({ ...ctx, capabilities: new Set() }, { brief, idempotencyKey: "k" })
    ).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  // Nợ #146 (25/09/2026): một lần bấm = một lần thu.
  describe("thu gộp kịch bản + bài viết", () => {
    it("thu 1 + 2 credit trên job kịch bản; job Content Engine đi kèm không thu thêm", async () => {
      vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 3, balanceAfter: 7 } } as never)
      vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: plan } as never)

      const r = await generateScenePlan(ctx, { brief, idempotencyKey: "k" })

      expect(vi.mocked(enqueueJob).mock.calls[0]![1]).toMatchObject({ costCredit: 3 })
      expect(vi.mocked(generateContent).mock.calls[0]![1]).toMatchObject({ includedInJobId: "job-1" })
      expect(refundPartial).not.toHaveBeenCalled()
      expect(r.usage).toEqual({ costCredit: 3, balanceAfter: 7 })
    })

    it("viết bài hỏng: kịch bản vẫn thành công, hoàn đúng phần bài viết", async () => {
      vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 3, balanceAfter: 7 } } as never)
      vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: plan } as never)
      vi.mocked(generateContent).mockRejectedValue(new Error("LLM sập"))

      const r = await generateScenePlan(ctx, { brief, idempotencyKey: "k" })

      expect(r.status).toBe("COMPLETED")
      expect(refundPartial).toHaveBeenCalledWith(ctx, "job-1", "goi-noi-dung-hong", 2)
      expect(r.usage).toEqual({ costCredit: 1, balanceAfter: 9 })
    })

    it("AI không viết được bài nào (Content Engine REJECTED) cũng hoàn phần bài viết", async () => {
      vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 3, balanceAfter: 7 } } as never)
      vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: plan } as never)
      findById.mockResolvedValue({ id: "content-1", status: "COMPLETED", result: "REJECTED" })

      await generateScenePlan(ctx, { brief, idempotencyKey: "k" })
      expect(refundPartial).toHaveBeenCalledWith(ctx, "job-1", "goi-noi-dung-hong", 2)
    })

    it("không chọn kênh đăng bài nào thì chỉ thu giá kịch bản", async () => {
      vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
      vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: plan } as never)
      await generateScenePlan(ctx, { brief: { ...brief, outputs: ["image"] }, idempotencyKey: "k" })
      expect(vi.mocked(enqueueJob).mock.calls[0]![1]).toMatchObject({ costCredit: 1 })
      expect(generateContent).not.toHaveBeenCalled()
    })
  })
})
