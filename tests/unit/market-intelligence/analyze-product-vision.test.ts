import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"

/**
 * Chặng 02 (25/09/2026, rà soát thương mại): lượt Vision AI vào sổ, đọc ảnh từ
 * kho theo asset_id, cùng ảnh không thu lần hai, hỏng thì hoàn — và KHÔNG bịa
 * dữ liệu khi mô hình không trả gì.
 */
const ctx: TenantContext = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set(["V1"]) }
const asset = { id: "asset-1", product_id: null, storage_key: "org/org-1/unfiled/asset-1.jpg", mime_type: "image/jpeg" }

const { findById } = vi.hoisted(() => ({ findById: vi.fn() }))
vi.mock("@/modules/assets/infra/asset-repository", () => {
  const mocked = { AssetRepository: vi.fn().mockImplementation(function () { return { findById } })
  }
  return { ...mocked, getAssetRepository: vi.fn(() => new mocked.AssetRepository()) }
})
vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: () => ({ get: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])), signedUrl: vi.fn().mockResolvedValue("https://kho/ky.jpg") }),
}))
const { startInline } = vi.hoisted(() => ({ startInline: vi.fn() }))
const { finishInline } = vi.hoisted(() => ({ finishInline: vi.fn() }))
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { startInline, finishInline } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})
vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({ enqueueJob: vi.fn() }))
vi.mock("@/modules/usage/use-cases/refund-job", () => ({ refundJob: vi.fn().mockResolvedValue({ refunded: true }) }))
vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: vi.fn() }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: vi.fn() }))
const { createProductVisionAdapter } = vi.hoisted(() => ({ createProductVisionAdapter: vi.fn() }))
vi.mock("@/modules/market-intelligence/adapters/product-vision-ai-adapter", () => ({ createProductVisionAdapter }))
vi.mock("@/modules/creative-production/use-cases/provider-preferences", () => ({
  providerOrderFor: vi.fn().mockResolvedValue(["claude_opus", "openai_structured", "gemini_pro"]),
}))
vi.mock("@/modules/market-intelligence/infra/market-intelligence-repository", () => {
  const marketIntelligenceRepo = { findProductAnalysis: vi.fn().mockResolvedValue(null) }
  return { marketIntelligenceRepo, getMarketIntelligenceRepository: vi.fn(() => marketIntelligenceRepo) }
})

import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { callCapability } from "@/core/ai/gateway"
import { marketIntelligenceRepo } from "@/modules/market-intelligence/infra/market-intelligence-repository"
import { analyzeProductVision, PRODUCT_VISION_EXTRACT_FEATURE } from "@/modules/market-intelligence/use-cases/analyze-product-vision"
import { refundJob } from "@/modules/usage/use-cases/refund-job"

const aiOut = {
  productName: "Bó hồng",
  components: [{ flowerType: "Hồng đỏ", quantityEstimate: 10, unit: "cành", role: "dominant" }],
  attributes: { mainColors: ["Đỏ"], secondaryColors: [], style: "", shape: "", sizeEstimate: "" },
  packaging: { wrappingMaterial: "", wrappingColor: "", ribbon: "", accessories: [] },
  context: { likelyOccasions: [], likelyAudience: "", suggestedPrice: 0, confidence: 0 },
}
const job = { id: "job-1", status: "PENDING", output: null }

describe("analyzeProductVision — Chặng 02 thu credit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findById.mockResolvedValue(asset)
    vi.mocked(marketIntelligenceRepo.findProductAnalysis).mockResolvedValue(null as never)
  })

  it("mô hình chạy: vào sổ qua enqueueJob (feature riêng, khoá theo ảnh), gửi ảnh ĐỌC TỪ KHO", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: aiOut } as never)

    const r = await analyzeProductVision(ctx, { assetId: "asset-1" })

    expect(vi.mocked(enqueueJob).mock.calls[0]![1]).toMatchObject({ feature: PRODUCT_VISION_EXTRACT_FEATURE, idempotencyKey: "vision-extract:asset-1" })
    expect(PRODUCT_VISION_EXTRACT_FEATURE).not.toBe("vision.analyze")
    // Qua cổng AI (nợ #155): năng lực product_vision, thứ tự nhà cung cấp của tiệm, ảnh ĐỌC TỪ KHO.
    expect(vi.mocked(callCapability).mock.calls[0]![0]).toMatchObject({
      capability: "product_vision",
      jobId: "job-1",
      preferredModelKeys: ["claude_opus", "openai_structured", "gemini_pro"],
    })
    expect(createProductVisionAdapter.mock.calls[0]![1].image).toEqual({ mimeType: "image/jpeg", base64: "AQID" })
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: true }))
    expect(r).toMatchObject({ source: "vision_ai", imageUrl: "https://kho/ky.jpg", usage: { costCredit: 1 } })
  })

  it("cùng ảnh bấm lại: trả kết quả cũ, không gọi mô hình, không thu", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({
      job: { ...job, status: "COMPLETED", output: aiOut }, deduped: true, usage: { costCredit: 0, balanceAfter: null },
    } as never)
    const r = await analyzeProductVision(ctx, { assetId: "asset-1" })
    expect(callCapability).not.toHaveBeenCalled()
    expect(r.components[0]!.flowerType).toBe("Hồng đỏ")
  })

  it("người dùng xác nhận phân tích lại: bỏ kết quả cũ, khoá mới theo lần bấm, gọi mô hình và thu", async () => {
    vi.mocked(marketIntelligenceRepo.findProductAnalysis).mockResolvedValue({ raw: {} } as never)
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 7 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: aiOut } as never)
    const out = await analyzeProductVision(ctx, { assetId: "asset-1", reanalyzeKey: "click-12345678" })
    expect(vi.mocked(enqueueJob).mock.calls[0]![1]).toMatchObject({ idempotencyKey: "vision-extract:asset-1:again:click-12345678" })
    expect(callCapability).toHaveBeenCalledTimes(1)
    expect(out.reused).toBeUndefined()
    expect(out.usage?.costCredit).toBe(1)
  })

  it("lượt trước hỏng (đã hoàn): nối khoá mới để thử lại được", async () => {
    vi.mocked(enqueueJob)
      .mockResolvedValueOnce({ job: { ...job, id: "cu", status: "FAILED" }, deduped: true, usage: { costCredit: 0, balanceAfter: null } } as never)
      .mockResolvedValueOnce({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 8 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "xong", output: aiOut } as never)
    await analyzeProductVision(ctx, { assetId: "asset-1" })
    expect(vi.mocked(enqueueJob).mock.calls[1]![1]).toMatchObject({ idempotencyKey: "vision-extract:asset-1:after:cu" })
  })

  it("mọi nhà cung cấp hỏng: job FAILED + hoàn credit + lỗi rõ — không bịa dữ liệu", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
    vi.mocked(callCapability).mockResolvedValue({ kind: "khong_chay_duoc", reason: "HET_DUONG_DU_PHONG", attempts: [] } as never)
    await expect(analyzeProductVision(ctx, { assetId: "asset-1" })).rejects.toThrow("đã hoàn credit")
    expect(finishInline).toHaveBeenCalledWith(ctx, "job-1", expect.objectContaining({ ok: false }))
    expect(refundJob).toHaveBeenCalledWith(ctx, "job-1")
  })

  it("lỗi đọc kho: câu lỗi trả client không chứa khoá kho nội bộ (audit API §22)", async () => {
    vi.mocked(enqueueJob).mockResolvedValue({ job, deduped: false, usage: { costCredit: 1, balanceAfter: 9 } } as never)
    vi.mocked(callCapability).mockRejectedValue(new Error("Không có tệp org/org-1/unfiled/a.jpg") as never)
    const error = (await analyzeProductVision(ctx, { assetId: "asset-1" }).catch((e: unknown) => e)) as Error
    expect(error.message).toContain("đã hoàn credit")
    expect(error.message).not.toContain("org/")
  })

  it("ảnh không thuộc tổ chức: 404 trước khi tạo job", async () => {
    findById.mockResolvedValue(null)
    await expect(analyzeProductVision(ctx, { assetId: "cua-to-chuc-khac" })).rejects.toThrow()
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("đã có kết quả M01 của ảnh: dùng lại miễn phí, giá trị thiếu để TRỐNG thay vì bịa", async () => {
    vi.mocked(marketIntelligenceRepo.findProductAnalysis).mockResolvedValue({ raw: { flowers: [{ name: "Tulip" }] }, edited: null } as never)
    const r = await analyzeProductVision(ctx, { assetId: "asset-1" })
    expect(enqueueJob).not.toHaveBeenCalled()
    expect(r.source).toBe("m01")
    expect(r.context).toEqual({ likelyOccasions: [], likelyAudience: "", suggestedPrice: 0, confidence: 0 })
    expect(r.components[0]!.quantityEstimate).toBe(0)
    expect(r.packaging.accessories).toEqual([])
  })
})
