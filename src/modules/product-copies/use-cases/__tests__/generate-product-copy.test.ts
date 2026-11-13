import { describe, expect, it, vi, beforeEach } from "vitest"
import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"

const mockTenantContext: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["H5"]),
}

const KHOA = "idem-1"

/**
 * Hình dạng THẬT của hợp đồng Vision (`workers/vision/contracts/Schema.json`).
 *
 * Fixture cũ ở tệp này khai `identity.style` và `identity.color_tone` — hai
 * trường KHÔNG có trong hợp đồng. Vì fixture tự bịa ra chúng, mọi ca thử đều
 * xanh trong khi đường chạy thật đưa `undefined` vào lời nhắc gửi cho mô
 * hình. Một fixture không khớp hợp đồng là một bộ test đo chính nó.
 */
const PHAN_TICH_THAT = {
  identity: {
    category: "Bó hoa",
    shape: "tròn",
    facing: "một mặt",
    container: "giấy gói",
    phong_cach: "Cổ điển",
    dip_su_dung: "Kỷ niệm",
  },
  bom: {
    flowers: [{ name: "Hồng đỏ", quantity: 20, mau: "đỏ", so_nu: 2, so_hong: 0 }],
    foliage: [{ name: "Lá bạc", quantity: 5 }],
    accessories: [],
    wrapping: [{ layer: "ngoài", material: "giấy kraft", color: "nâu" }],
  },
  palette_accounting: [{ cluster_index: 0, nhom: "đỏ", thuoc_ve: "hoa", confidence: 90 }],
  checklist: { hoa_chu_dao: "Hồng đỏ" },
  san_xuat: { so_tang_lop: 3 },
  flower_count: 20,
  bud_count: 2,
  damaged_count: 0,
  confidence: 90,
}

vi.mock("@/modules/products/infra/product-analysis-repository", () => {
  const mocked = {
    ProductAnalysisRepository: vi.fn().mockImplementation(function () { return { findById: vi.fn() } }),
  }
  return { ...mocked, getProductAnalysisRepository: vi.fn(() => new mocked.ProductAnalysisRepository()) }
})

vi.mock("@/modules/profiles/infra/brand-profile-repository", () => {
  const mocked = {
    BrandProfileRepository: vi.fn().mockImplementation(function () { return { current: vi.fn() } }),
  }
  return { ...mocked, getBrandProfileRepository: vi.fn(() => new mocked.BrandProfileRepository()) }
})

vi.mock("@/modules/organization/infra/occasion-repository", () => {
  const mocked = {
    OccasionRepository: vi.fn().mockImplementation(function () { return { list: vi.fn() } }),
  }
  return { ...mocked, getOccasionRepository: vi.fn(() => new mocked.OccasionRepository()) }
})

vi.mock("@/modules/product-copies/infra/product-copy-repository", () => {
  const mocked = {
    ProductCopyRepository: vi.fn().mockImplementation(function () { return {
      db: {},
      findByAnalysisId: vi.fn(),
      createFromAnalysis: vi.fn(),
    } }),
  }
  return { ...mocked, getProductCopyRepository: vi.fn(() => new mocked.ProductCopyRepository()) }
})

vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return {
      startInline: vi.fn(),
      finishInline: vi.fn(),
    } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})

vi.mock("@/modules/jobs/use-cases/enqueue-job", () => ({ enqueueJob: vi.fn() }))
vi.mock("@/modules/usage/use-cases/refund-job", () => ({ refundJob: vi.fn() }))
vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: vi.fn() }))
vi.mock("@/modules/product-copies/adapters/product-copy-adapter", () => ({
  createProductCopyAdapter: vi.fn(),
}))
vi.mock("@/core/ai/adapters/openai-llm-provider", () => ({ OpenAILLMProvider: vi.fn() }))

import { generateProductCopy } from "@/modules/product-copies/use-cases/generate-product-copy"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { BrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import { OccasionRepository } from "@/modules/organization/infra/occasion-repository"
import { ProductCopyRepository } from "@/modules/product-copies/infra/product-copy-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { enqueueJob } from "@/modules/jobs/use-cases/enqueue-job"
import { refundJob } from "@/modules/usage/use-cases/refund-job"
import { callCapability } from "@/core/ai/gateway"
import { createProductCopyAdapter } from "@/modules/product-copies/adapters/product-copy-adapter"

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("generateProductCopy", () => {
  let analysisRepo: any
  let brandRepo: any
  let occasionRepo: any
  let copyRepo: any
  let jobRepo: any

  const ketQuaAi = {
    kind: "xong",
    output: {
      suggested_name: "Bó hồng đỏ cổ điển",
      suggested_description: "Mô tả",
      suggested_tags: ["hoa-hong"],
      suggested_occasions: ["Kỷ niệm"],
      suggested_price_segment: "standard",
    },
    model: { key: "openai_structured", provider: "openai" },
    attempts: [{ model: "openai_structured", outcome: "ACCEPTED", costUsd: 0.002, latencyMs: 1200 }],
    evaluation: { needsReview: false, scores: {}, overall: 1, thresholdUsed: null, reason: null },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    analysisRepo = { findById: vi.fn() }
    brandRepo = { current: vi.fn().mockResolvedValue(null) }
    occasionRepo = { list: vi.fn().mockResolvedValue([{ code: "ky-niem", name: "Kỷ niệm" }]) }
    copyRepo = { db: {}, findByAnalysisId: vi.fn().mockResolvedValue(null), createFromAnalysis: vi.fn() }
    jobRepo = { startInline: vi.fn(), finishInline: vi.fn() }

    vi.mocked(ProductAnalysisRepository).mockImplementation(function () { return analysisRepo })
    vi.mocked(BrandProfileRepository).mockImplementation(function () { return brandRepo })
    vi.mocked(OccasionRepository).mockImplementation(function () { return occasionRepo })
    vi.mocked(ProductCopyRepository).mockImplementation(function () { return copyRepo })
    vi.mocked(GenerationJobRepository).mockImplementation(function () { return jobRepo })
    vi.mocked(enqueueJob).mockResolvedValue({
      job: { id: "job-1" },
      deduped: false,
      usage: { costCredit: 1, balanceAfter: 99 },
    } as any)
    vi.mocked(createProductCopyAdapter).mockReturnValue((() => undefined) as any)
    vi.mocked(callCapability).mockResolvedValue(ketQuaAi as any)
    copyRepo.createFromAnalysis.mockResolvedValue({ id: "copy-moi", raw: ketQuaAi.output })
    // `generateProductCopy` gọi `refundJob(...).catch(() => undefined)` trên đường lỗi (dòng
    // hoàn credit khi job FAILED) — thiếu giá trị mặc định này làm mock trả `undefined` thay vì
    // Promise, và `.catch` trên `undefined` ném TypeError che mất `AppError` thật đang được test.
    vi.mocked(refundJob).mockResolvedValue(undefined as any)
  })

  const daDuyet = (extra: Record<string, unknown> = {}) => ({
    id: "analysis-1",
    approval_state: "APPROVED",
    product_id: null,
    raw: PHAN_TICH_THAT,
    edited: null,
    ...extra,
  })

  it("phân tích không tồn tại thì không chạm hạn mức", async () => {
    analysisRepo.findById.mockResolvedValue(null)

    await expect(
      generateProductCopy(mockTenantContext, { analysisId: "khong-co", idempotencyKey: KHOA })
    ).rejects.toThrow(AppError)
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("phân tích chưa duyệt trả 422 và không chạm hạn mức", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet({ approval_state: "PENDING" }))

    const err = await generateProductCopy(mockTenantContext, {
      analysisId: "analysis-1",
      idempotencyKey: KHOA,
    }).catch((e: Error) => e)

    expect((err as AppError).code).toBe("UNPROCESSABLE_ENTITY")
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("product_id lệch thì trả CONFLICT", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet({ product_id: "sp-khac" }))

    await expect(
      generateProductCopy(mockTenantContext, {
        analysisId: "analysis-1",
        productId: "sp-1",
        idempotencyKey: KHOA,
      })
    ).rejects.toThrow(AppError)
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("thiếu cả nhận dạng lẫn định mức thì dừng trước khi tính tiền", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet({ raw: { confidence: 90 } }))

    await expect(
      generateProductCopy(mockTenantContext, { analysisId: "analysis-1", idempotencyKey: KHOA })
    ).rejects.toThrow(AppError)
    expect(enqueueJob).not.toHaveBeenCalled()
  })

  it("bản đã sinh trước đó trả lại nguyên, không gọi mô hình lần hai", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())
    copyRepo.findByAnalysisId.mockResolvedValue({
      id: "copy-cu",
      raw: { suggested_name: "Cũ" },
      model_key: "openai_structured",
    })

    const ra = await generateProductCopy(mockTenantContext, {
      analysisId: "analysis-1",
      idempotencyKey: KHOA,
    })

    expect(ra.copyId).toBe("copy-cu")
    expect(enqueueJob).not.toHaveBeenCalled()
    expect(callCapability).not.toHaveBeenCalled()
  })

  it("lượt chạy thật đi qua hạn mức, ghi usage và khoá idempotency", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())

    const ra = await generateProductCopy(mockTenantContext, {
      analysisId: "analysis-1",
      idempotencyKey: KHOA,
    })

    expect(ra.copyId).toBe("copy-moi")
    expect(enqueueJob).toHaveBeenCalledWith(
      mockTenantContext,
      expect.objectContaining({ feature: "product.copy.generate", idempotencyKey: KHOA })
    )
    expect(jobRepo.startInline).toHaveBeenCalled()
    expect(jobRepo.finishInline).toHaveBeenCalledWith(
      mockTenantContext,
      "job-1",
      expect.objectContaining({ ok: true })
    )
  })

  it("không ghim mô hình — để bộ định tuyến của cổng AI chọn", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())

    await generateProductCopy(mockTenantContext, { analysisId: "analysis-1", idempotencyKey: KHOA })

    const yeuCau = vi.mocked(callCapability).mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(yeuCau.pinnedModelKey).toBeUndefined()
    expect(yeuCau.jobId).toBe("job-1")
  })

  it("lưu lại mô hình, nhà cung cấp, chi phí và độ trễ của lượt gọi", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())

    await generateProductCopy(mockTenantContext, { analysisId: "analysis-1", idempotencyKey: KHOA })

    expect(copyRepo.createFromAnalysis).toHaveBeenCalledWith(
      mockTenantContext,
      expect.objectContaining({
        jobId: "job-1",
        modelKey: "openai_structured",
        provider: "openai",
        costUsd: 0.002,
        latencyMs: 1200,
      })
    )
  })

  it("thiếu phong cách trong kết quả thì lấy lại từ đúng trường của hợp đồng", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())

    await generateProductCopy(mockTenantContext, { analysisId: "analysis-1", idempotencyKey: KHOA })

    const luu = copyRepo.createFromAnalysis.mock.calls[0][1]
    expect(luu.raw.suggested_style).toBe("Cổ điển")
  })

  it("lượt chạy hỏng thì job FAILED và credit được hoàn", async () => {
    analysisRepo.findById.mockResolvedValue(daDuyet())
    vi.mocked(callCapability).mockResolvedValue({
      kind: "khong_chay_duoc",
      reason: "khong_co_mo_hinh_du_dieu_kien",
      attempts: [],
    } as any)

    await expect(
      generateProductCopy(mockTenantContext, { analysisId: "analysis-1", idempotencyKey: KHOA })
    ).rejects.toThrow(AppError)

    expect(jobRepo.finishInline).toHaveBeenCalledWith(
      mockTenantContext,
      "job-1",
      expect.objectContaining({ ok: false })
    )
    expect(refundJob).toHaveBeenCalledWith(mockTenantContext, "job-1")
  })
})
