import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"

// Nhánh Cloud của M04b (23/09/2026) — phải đi qua `enqueueJob` (hạn mức,
// credit, usage, Idempotency-Key) và cùng cổng "Master đã duyệt" như nhánh
// local. Bản trước chạy đồng bộ trong request HTTP, không qua cổng nào.

const enqueueJob = vi.fn()
const findById = vi.fn()

vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({
  enqueueJob: (...args: unknown[]) => enqueueJob(...args),
}))
vi.mock("@/modules/assets/infra/asset-repository", () => {
  const mocked = {
    AssetRepository: vi.fn().mockImplementation(function () { return { findById } }),
  }
  return { ...mocked, getAssetRepository: vi.fn(() => new mocked.AssetRepository()) }
})
const findJobById = vi.fn()
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { findById: findJobById } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})

const { requestCloudVariant, requestVariants } = await import(
  "@/modules/media/use-cases/request-variants"
)
const { MEDIA_VARIANT_CLOUD_FEATURE, MEDIA_VARIANT_FEATURE, MAX_SCENE_PROMPT_LENGTH } = await import(
  "@/modules/media/domain/variant-rules"
)
const { costCreditForFeature } = await import("@/modules/usage/domain/pricing")

const ctx = { organizationId: "org-1", userId: "u-1" } as unknown as TenantContext

type EnqueueCall = {
  feature: string
  idempotencyKey: string
  productId: string | null
  payload: Record<string, unknown> & { scene_prompt?: string }
}

const base = {
  masterAssetId: "m-1",
  preset: "luxury_hotel" as const,
  ratio: "1:1" as const,
  watermark: true,
  idempotencyKey: "k-1",
}

describe("requestCloudVariant — nhánh Cloud M04b qua hàng đợi job", () => {
  beforeEach(() => {
    enqueueJob.mockReset().mockResolvedValue({
      job: { id: "job-1", status: "PENDING" },
      deduped: false,
      usage: { costCredit: 2, balanceAfter: 10 },
    })
    findById.mockReset().mockResolvedValue({
      id: "m-1",
      kind: "MASTER",
      approval_state: "APPROVED",
      product_id: "p-1",
    })
  })

  it("tạo job feature media.variant.cloud qua enqueueJob, mang scene_index và provider", async () => {
    await requestCloudVariant(ctx, {
      ...base,
      provider: "stability",
      scenePrompt: "  grand hotel lobby  ",
      sceneIndex: 2,
    })
    expect(enqueueJob).toHaveBeenCalledTimes(1)
    const [, input] = enqueueJob.mock.calls[0] as [TenantContext, EnqueueCall]
    expect(input.feature).toBe(MEDIA_VARIANT_CLOUD_FEATURE)
    expect(input.idempotencyKey).toBe("k-1")
    expect(input.productId).toBe("p-1")
    expect(input.payload).toMatchObject({
      master_asset_id: "m-1",
      preset: "luxury_hotel",
      provider: "stability",
      scene_prompt: "grand hotel lobby",
      scene_index: 2,
    })
  })

  it("cắt mô tả cảnh quá dài", async () => {
    await requestCloudVariant(ctx, { ...base, provider: "stability", scenePrompt: "x".repeat(5000) })
    const [, input] = enqueueJob.mock.calls[0] as [TenantContext, EnqueueCall]
    expect(input.payload.scene_prompt?.length).toBe(MAX_SCENE_PROMPT_LENGTH)
  })

  it("chặn 409 khi nguồn chưa phải Master đã duyệt — không tạo job, không trừ credit", async () => {
    findById.mockResolvedValue({ id: "m-1", kind: "ORIGINAL", approval_state: "PENDING", product_id: null })
    await expect(requestCloudVariant(ctx, { ...base, provider: "stability" })).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("asset không thuộc tổ chức → 404, không tạo job", async () => {
    findById.mockResolvedValue(null)
    await expect(requestCloudVariant(ctx, { ...base, provider: "stability" })).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("nhánh local mang scene_index khi có", async () => {
    await requestVariants(ctx, { ...base, sceneIndex: 1 })
    const [, input] = enqueueJob.mock.calls[0] as [TenantContext, EnqueueCall]
    expect(input.feature).toBe(MEDIA_VARIANT_FEATURE)
    expect(input.payload.scene_index).toBe(1)
  })

  it("nhánh Cloud có giá riêng, đắt hơn nhánh local 0đ nhà cung cấp", () => {
    expect(costCreditForFeature(MEDIA_VARIANT_CLOUD_FEATURE)).toBeGreaterThan(
      costCreditForFeature(MEDIA_VARIANT_FEATURE)
    )
  })
})


// ─── Đợt 1 nâng cấp chất lượng ảnh (24/09/2026) — chỉ đạo khung hình ───────

describe("request-variants — chỉ đạo khung hình vào payload job", () => {
  const PLAN_ID = "11111111-2222-4333-8444-555555555555"
  beforeEach(() => {
    enqueueJob.mockReset().mockResolvedValue({
      job: { id: "job-1", status: "PENDING" },
      deduped: false,
      usage: { costCredit: 2, balanceAfter: 10 },
    })
    findById.mockReset().mockResolvedValue({ id: "m-1", kind: "MASTER", approval_state: "APPROVED", product_id: "p-1" })
    findJobById.mockReset()
  })

  it("mặc định full_frame kể cả khi không có kịch bản", async () => {
    await requestVariants(ctx, base)
    const call = enqueueJob.mock.calls[0]![1] as EnqueueCall
    expect(call.payload.fill_mode).toBe("full_frame")
    expect(call.payload.composition).toEqual({ shot: "medium", placement: "center" })
    expect(call.payload.lighting).toEqual({ direction: "left" })
  })

  it("lấy cỡ cảnh / hướng sáng / bảng màu từ đúng cảnh của kịch bản", async () => {
    const { buildRuleScenePlan, parseStoredScenePlan } = await import(
      "@/modules/creative-production/domain/scene-plan-rules"
    )
    const plan = buildRuleScenePlan({
      mode: "CREATIVE",
      productName: "Bó hồng",
      colors: ["đỏ"],
      components: ["hồng"],
      occasions: [],
      topic: { id: "t", title: "Kỷ niệm" },
    })
    expect(parseStoredScenePlan(plan)).not.toBeNull()
    findJobById.mockResolvedValue({ id: PLAN_ID, feature: "creative.scene_plan", status: "COMPLETED", output: plan })

    await requestCloudVariant(ctx, { ...base, provider: "stability", sceneIndex: 3, scenePlanId: PLAN_ID })
    const call = enqueueJob.mock.calls[0]![1] as EnqueueCall
    const canh = plan.scenes.find((s) => s.sceneIndex === 3)!
    expect((call.payload.composition as { shot: string }).shot).toBe(canh.shot)
    expect(call.payload.palette).toEqual(canh.palette.slice(0, 5))
    expect(call.payload.direction_from_plan).toContain("shot")
  })

  it("không đọc được kịch bản thì vẫn tạo job với mặc định — gợi ý không bao giờ chặn", async () => {
    findJobById.mockRejectedValue(new Error("db down"))
    await requestVariants(ctx, { ...base, sceneIndex: 2, scenePlanId: PLAN_ID })
    const call = enqueueJob.mock.calls[0]![1] as EnqueueCall
    expect(call.payload.fill_mode).toBe("full_frame")
    expect(call.payload.direction_from_plan).toBeUndefined()
  })

  it("giá trị người gọi đi thẳng vào payload", async () => {
    await requestCloudVariant(ctx, {
      ...base,
      provider: "stability",
      direction: { fillMode: "pad", composition: { shot: "close", placement: "left_third" }, lighting: { direction: "above", mood: "golden hour" }, seed: 99 },
    })
    const call = enqueueJob.mock.calls[0]![1] as EnqueueCall
    expect(call.payload).toMatchObject({
      fill_mode: "pad",
      composition: { shot: "close", placement: "left_third" },
      lighting: { direction: "above", mood: "golden hour" },
      seed: 99,
    })
  })
})
