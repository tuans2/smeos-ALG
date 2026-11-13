/**
 * Đợt 3 nâng cấp chất lượng ảnh biến thể (25/09/2026): chất lượng / tăng nét /
 * cách ghép — giá hiện trên nút = giá `enqueueJob` trừ; payload đúng tên trường;
 * hằng hai phía TS ↔ worker không lệch.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import {
  COMPOSE_MODES,
  VARIANT_QUALITIES,
  VARIANT_UPSCALES,
} from "@/modules/media/domain/variant-direction-rules"
import {
  HIGH_QUALITY_SURCHARGE,
  PROVIDER_UPSCALE_SURCHARGE,
  RELIGHT_SURCHARGE,
  renderOptionsPayload,
  resolveComposeMode,
  variantTotalCostCredit,
  variantUnitCostCredit,
} from "@/modules/media/domain/variant-candidates"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { mediaVariantBodySchema } from "@/modules/creative-production/contracts/stage-06c-media"

const ROOT = path.resolve(__dirname, "../../..")

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
vi.mock("@/modules/jobs/infra/generation-job-repository", () => {
  const mocked = {
    GenerationJobRepository: vi.fn().mockImplementation(function () { return { findById: vi.fn() } }),
  }
  return { ...mocked, getGenerationJobRepository: vi.fn(() => new mocked.GenerationJobRepository()) }
})
const { requestCloudVariant, requestVariants } = await import("@/modules/media/use-cases/request-variants")

const ctx = { organizationId: "org-1", userId: "u-1" } as unknown as TenantContext
const base = { masterAssetId: "m-1", preset: "wedding" as const, ratio: "9:16" as const, watermark: false, idempotencyKey: "k" }

describe("giá theo tuỳ chọn dựng ảnh", () => {
  it("cục bộ và đám mây chỉ-hậu-cảnh = giá theo feature", () => {
    expect(variantUnitCostCredit("local_studio")).toBe(costCreditForFeature("media.variant"))
    expect(variantUnitCostCredit("cloud_provider", { quality: "standard", upscale: "none", composeMode: "paste" })).toBe(
      costCreditForFeature("media.variant.cloud")
    )
  })

  it("đám mây mặc định = nhà cung cấp trọn gói (PO 25/09): +RELIGHT; tăng nét của nhà cung cấp +1", () => {
    const cloud = costCreditForFeature("media.variant.cloud")
    expect(resolveComposeMode("cloud_provider")).toBe("relight")
    expect(variantUnitCostCredit("cloud_provider")).toBe(cloud + RELIGHT_SURCHARGE)
    expect(variantUnitCostCredit("cloud_provider", { upscale: "2x" })).toBe(cloud + RELIGHT_SURCHARGE + PROVIDER_UPSCALE_SURCHARGE)
    // Relight không có bậc chất lượng tính thêm
    expect(variantUnitCostCredit("cloud_provider", { quality: "high" })).toBe(cloud + RELIGHT_SURCHARGE)
  })

  it("cục bộ không làm được relight", () => {
    expect(resolveComposeMode("local_studio", "relight")).toBe("paste")
    expect(resolveComposeMode("local_studio", "harmonize")).toBe("harmonize")
  })

  it("Ultra chỉ tính ở đám mây chỉ-hậu-cảnh (cục bộ không có Ultra)", () => {
    expect(variantUnitCostCredit("cloud_provider", { quality: "high", composeMode: "paste" })).toBe(
      costCreditForFeature("media.variant.cloud") + HIGH_QUALITY_SURCHARGE
    )
    expect(variantUnitCostCredit("local_studio", { quality: "high" })).toBe(costCreditForFeature("media.variant"))
  })

  it("nhân theo số phương án", () => {
    expect(variantTotalCostCredit("cloud_provider", 2, { quality: "high" })).toBe(
      2 * variantUnitCostCredit("cloud_provider", { quality: "high" })
    )
  })
})

describe("renderOptionsPayload", () => {
  it("chỉ gửi giá trị khác mặc định, đúng tên trường hợp đồng 06c", () => {
    expect(renderOptionsPayload({ quality: "standard", upscale: "none" })).toEqual({})
    // compose_mode gửi khi người dùng chọn tường minh (mặc định do máy chủ quyết theo engine)
    expect(renderOptionsPayload({ composeMode: "paste" })).toEqual({ compose_mode: "paste" })
    expect(renderOptionsPayload({ quality: "high", upscale: "2x", composeMode: "harmonize" })).toEqual({
      quality: "high",
      upscale: "2x",
      compose_mode: "harmonize",
    })
  })

  it("hợp đồng 06c: quality/upscale có mặc định; compose_mode và provider_key bỏ trống = máy chủ quyết", () => {
    const d = mediaVariantBodySchema.parse({ master_asset_id: "m", preset: "wedding", ratio: "9:16" })
    expect(d).toMatchObject({ quality: "standard", upscale: "none" })
    expect(d.compose_mode).toBeUndefined()
    expect(d.provider_key).toBeUndefined()
    expect(mediaVariantBodySchema.parse({ master_asset_id: "m", preset: "wedding", ratio: "9:16", provider_key: "fal" }).provider_key).toBe("fal")
  })
})

describe("request-variants — tuỳ chọn dựng ảnh vào payload + costCredit", () => {
  beforeEach(() => {
    enqueueJob.mockReset().mockResolvedValue({
      job: { id: "job-1", status: "PENDING" },
      deduped: false,
      usage: { costCredit: 4, balanceAfter: 10 },
    })
    findById.mockReset().mockResolvedValue({ id: "m-1", kind: "MASTER", approval_state: "APPROVED", product_id: "p-1" })
  })

  it("đám mây chất lượng cao: payload mang quality/upscale/compose_mode, costCredit đúng bảng giá", async () => {
    await requestCloudVariant(ctx, {
      ...base,
      provider: "stability",
      render: { quality: "high", upscale: "2x", composeMode: "harmonize" },
    })
    const input = enqueueJob.mock.calls[0]![1] as { costCredit: number; payload: Record<string, unknown> }
    expect(input.payload).toMatchObject({ quality: "high", upscale: "2x", compose_mode: "harmonize" })
    expect(input.costCredit).toBe(variantUnitCostCredit("cloud_provider", { quality: "high", upscale: "2x", composeMode: "harmonize" }))
  })

  it("đám mây không chọn gì: worker nhận compose_mode=relight tường minh, giá trọn gói, không ép nhà cung cấp", async () => {
    await requestCloudVariant(ctx, base)
    const input = enqueueJob.mock.calls[0]![1] as { costCredit: number; payload: Record<string, unknown> }
    expect(input.payload.compose_mode).toBe("relight")
    expect(input.payload.provider).toBeUndefined()
    expect(input.costCredit).toBe(variantUnitCostCredit("cloud_provider"))
  })

  it("cục bộ mặc định: costCredit = giá feature, payload không có trường Đợt 3", async () => {
    await requestVariants(ctx, base)
    const input = enqueueJob.mock.calls[0]![1] as { costCredit: number; payload: Record<string, unknown> }
    expect(input.costCredit).toBe(costCreditForFeature("media.variant"))
    expect(input.payload.quality).toBeUndefined()
    expect(input.payload.compose_mode).toBe("paste")
  })
})

describe("hằng TS ↔ worker Python không lệch", () => {
  const src = readFileSync(path.join(ROOT, "workers/media_ai/providers/background/base.py"), "utf8")
  const tuple = (name: string) => {
    const m = src.match(new RegExp(`^${name} = \\(([^)]*)\\)`, "m"))
    return m ? [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null
  }
  it("CHAT_LUONG / TANG_NET / CACH_GHEP", () => {
    expect(tuple("CHAT_LUONG")).toEqual([...VARIANT_QUALITIES])
    expect(tuple("TANG_NET")).toEqual([...VARIANT_UPSCALES])
    expect(tuple("CACH_GHEP")).toEqual([...COMPOSE_MODES])
  })

  it("ngưỡng đo perceptual: TS = bản gốc, worker giữ bản sao", async () => {
    const { PERCEPTUAL_THRESHOLDS } = await import("@/modules/media/domain/variant-rules")
    const py = readFileSync(path.join(ROOT, "workers/media_ai/image/do_giu_nguyen.py"), "utf8")
    for (const [k, [safe, warn]] of Object.entries(PERCEPTUAL_THRESHOLDS)) {
      const m = py.match(new RegExp(`"${k}": \\(([0-9.]+), ([0-9.]+)\\)`))
      expect(m, k).not.toBeNull()
      expect([Number(m![1]), Number(m![2])]).toEqual([safe, warn])
    }
  })
})

describe("cổng Subject Integrity theo cách đo (PO 25/09/2026)", () => {
  it("perceptual: số đo xấu nhất quyết định, thiếu số đo = REJECTED", async () => {
    const { parseVariantIntegrityBlock, perceptualIntegrityResult } = await import("@/modules/media/domain/variant-rules")
    const tot = { structure_ssim: 0.95, color_delta_e: 3, shape_iou: 0.97 }
    expect(perceptualIntegrityResult(tot)).toBe("SAFE")
    expect(perceptualIntegrityResult({ ...tot, color_delta_e: 12 })).toBe("WARNING")
    expect(perceptualIntegrityResult({ ...tot, shape_iou: 0.5 })).toBe("REJECTED")
    expect(perceptualIntegrityResult({ ...tot, shape_iou: null })).toBe("REJECTED")

    const khoi = parseVariantIntegrityBlock({
      method: "perceptual", subject_pixel_identity: 0.95, source_master_asset_id: "m",
      structure_ssim: 0.95, color_delta_e: 3, shape_iou: 0.97, ai_relit: true, result: "REJECTED",
    })
    // Máy chủ tính LẠI phán quyết từ số đo, không tin worker.
    expect(khoi).toMatchObject({ method: "perceptual", result: "SAFE", ai_relit: true })
  })

  it("pixel_exact giữ nguyên luật cũ", async () => {
    const { parseVariantIntegrityBlock } = await import("@/modules/media/domain/variant-rules")
    const khoi = parseVariantIntegrityBlock({ subject_pixel_identity: 0.995, source_master_asset_id: "m" })
    expect(khoi).toMatchObject({ method: "pixel_exact", result: "WARNING", ai_relit: false })
  })
})
