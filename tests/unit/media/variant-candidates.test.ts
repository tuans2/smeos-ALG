/**
 * Đợt 2 nâng cấp chất lượng ảnh biến thể (25/09/2026): nhiều phương án cho một
 * cảnh phải KHÁC NHAU THẬT, credit hiện trước khi bấm khớp đúng số bị trừ, và
 * hằng phong cách hai phía TS ↔ worker không lệch.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import {
  VARIANT_STYLES,
  resolveVariantDirection,
} from "@/modules/media/domain/variant-direction-rules"
import {
  MAX_VARIANT_COUNT,
  alternateDirection,
  candidateDirections,
  candidateIdempotencyKey,
  clampVariantCount,
  directionFromRecord,
  directionRequestFields,
  SIMILAR_CANDIDATE_COUNT,
  similarDirection,
  variantTotalCostCredit,
  variantUnitCostCredit,
} from "@/modules/media/domain/variant-candidates"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"

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

const { requestCloudVariant, requestVariants, candidateGroupId } = await import(
  "@/modules/media/use-cases/request-variants"
)

const ctx = { organizationId: "org-1", userId: "u-1" } as unknown as TenantContext
const base = { masterAssetId: "m-1", preset: "wedding" as const, ratio: "9:16" as const, watermark: false, idempotencyKey: "k-1" }

describe("candidateDirections — phương án khác nhau thật", () => {
  const d = resolveVariantDirection({ composition: { shot: "medium" }, lighting: { direction: "left" } })

  it("phương án 1 luôn là chỉ đạo gốc", () => {
    expect(candidateDirections(d, 3, "cloud_provider")[0]).toEqual(d)
    expect(candidateDirections(d, 3, "local_studio")[0]).toEqual(d)
  })

  it("đám mây: giữ chỉ đạo, seed liên tiếp khi đã chốt seed (tái tạo cả bộ)", () => {
    const list = candidateDirections({ ...d, seed: 10 }, 3, "cloud_provider")
    expect(list.map((x) => x.seed)).toEqual([10, 11, 12])
    expect(new Set(list.map((x) => x.composition.shot))).toEqual(new Set(["medium"]))
  })

  it("đám mây không chốt seed: để trống cho worker tự bốc", () => {
    const list = candidateDirections(d, 2, "cloud_provider")
    expect(list[1]!.seed).toBeUndefined()
  })

  it("cục bộ (không seed): mỗi phương án khác bố cục hoặc hướng sáng", () => {
    const list = candidateDirections(d, MAX_VARIANT_COUNT, "local_studio")
    const keys = list.map((x) => `${x.composition.placement}|${x.lighting.direction}`)
    expect(new Set(keys).size).toBe(list.length)
  })

  it("số phương án kẹp trong 1..4", () => {
    expect(clampVariantCount(0)).toBe(1)
    expect(clampVariantCount(9)).toBe(MAX_VARIANT_COUNT)
    expect(clampVariantCount(undefined)).toBe(1)
    expect(candidateDirections(d, 9, "local_studio")).toHaveLength(MAX_VARIANT_COUNT)
  })
})

describe("alternateDirection — 'Thử hướng khác'", () => {
  it("đổi cỡ cảnh, hướng sáng, phong cách; bỏ seed; giữ bảng màu", () => {
    const cur = resolveVariantDirection({ composition: { shot: "medium" }, lighting: { direction: "left" }, seed: 5, palette: ["đỏ"] })
    const alt = alternateDirection(cur)
    expect(alt.composition.shot).not.toBe(cur.composition.shot)
    expect(alt.lighting.direction).toBe("right")
    expect(alt.style).toBeDefined()
    expect(alt.seed).toBeUndefined()
    expect(alt.palette).toEqual(["đỏ"])
  })

  it("bấm liên tiếp đi qua đủ ba cỡ cảnh", () => {
    let d = resolveVariantDirection({})
    const shots = new Set<string>()
    for (let i = 0; i < 3; i++) {
      d = alternateDirection(d)
      shots.add(d.composition.shot)
    }
    expect(shots.size).toBe(3)
  })
})

describe("similarDirection — 'Sinh lại giống thế này' không trùng ảnh đang xem", () => {
  it.each(["center", "left_third", "right_third"] as const)("cục bộ, vị trí %s", (placement) => {
    for (const light of ["left", "right", "above", "front"] as const) {
      const cur = resolveVariantDirection({ composition: { shot: "wide", placement }, lighting: { direction: light } })
      const key = (x: typeof cur) => `${x.composition.shot}|${x.composition.placement}|${x.lighting.direction}`
      const list = candidateDirections(similarDirection(cur, "local_studio"), SIMILAR_CANDIDATE_COUNT, "local_studio")
      expect(list.map(key)).not.toContain(key(cur))
      expect(new Set(list.map(key)).size).toBe(list.length)
      expect(list.every((x) => x.composition.shot === "wide")).toBe(true)
    }
  })

  it("đám mây: giữ chỉ đạo + phong cách, bỏ seed để worker bốc seed mới", () => {
    const cur = resolveVariantDirection({ seed: 42, style: "film", composition: { shot: "close" } })
    const sim = similarDirection(cur, "cloud_provider")
    expect(sim.seed).toBeUndefined()
    expect(sim).toMatchObject({ style: "film", composition: { shot: "close" } })
  })

  it("directionRequestFields ra đúng tên trường hợp đồng 06c", () => {
    const f = directionRequestFields(resolveVariantDirection({ seed: 3, style: "vivid", palette: ["đỏ"] }))
    expect(f).toEqual({
      fill_mode: "full_frame",
      composition: { shot: "medium", placement: "center" },
      lighting: { direction: "left" },
      palette: ["đỏ"],
      seed: 3,
      style: "vivid",
    })
  })
})

describe("directionFromRecord — đọc lại chỉ đạo worker đã dùng", () => {
  it("đọc snake_case của metadata asset", () => {
    const d = directionFromRecord({
      composition: { shot: "close", placement: "right_third" },
      light_direction: "above",
      seed: 77,
      style: "film",
      palette: ["kem"],
    })
    expect(d).toMatchObject({ composition: { shot: "close", placement: "right_third" }, lighting: { direction: "above" }, seed: 77, style: "film", palette: ["kem"] })
  })

  it("giá trị lạ lùi về mặc định", () => {
    expect(directionFromRecord({ composition: { shot: "x" }, light_direction: "y", style: "anime" })).toMatchObject({
      composition: { shot: "medium", placement: "center" },
      lighting: { direction: "left" },
    })
    expect(directionFromRecord(null).style).toBeUndefined()
  })
})

describe("credit hiện trước khi bấm = credit bị trừ", () => {
  it("đơn giá theo đúng bảng giá enqueueJob", () => {
    expect(variantUnitCostCredit("local_studio")).toBe(costCreditForFeature("media.variant"))
    // Đám mây chỉ-hậu-cảnh (`paste`) = giá feature; mặc định đám mây (trọn gói) xem variant-render-options.test.ts.
    expect(variantUnitCostCredit("cloud_provider", { composeMode: "paste" })).toBe(costCreditForFeature("media.variant.cloud"))
    expect(variantTotalCostCredit("cloud_provider", 3, { composeMode: "paste" })).toBe(3 * costCreditForFeature("media.variant.cloud"))
  })

  it("khoá idempotency: phương án 1 giữ khoá gốc", () => {
    expect(candidateIdempotencyKey("k", 0)).toBe("k")
    expect(candidateIdempotencyKey("k", 2)).toBe("k:c3")
  })
})

describe("request-variants — variant_count tạo job con cùng job_group_id", () => {
  beforeEach(() => {
    let n = 0
    enqueueJob.mockReset().mockImplementation(async () => ({
      job: { id: `job-${++n}`, status: "PENDING" },
      deduped: false,
      usage: { costCredit: 2, balanceAfter: 100 - 2 * n },
    }))
    findById.mockReset().mockResolvedValue({ id: "m-1", kind: "MASTER", approval_state: "APPROVED", product_id: "p-1" })
  })

  it("variant_count = 1 giữ nguyên hành vi cũ: một job, khoá gốc, không nhóm", async () => {
    const r = await requestVariants(ctx, base)
    expect(enqueueJob).toHaveBeenCalledTimes(1)
    const input = enqueueJob.mock.calls[0]![1] as { idempotencyKey: string; jobGroupId?: string; payload: Record<string, unknown> }
    expect(input.idempotencyKey).toBe("k-1")
    expect(input.jobGroupId).toBeUndefined()
    expect(input.payload.candidate_index).toBeUndefined()
    expect(r.jobGroupId).toBeNull()
    expect(r.candidates).toHaveLength(1)
  })

  it("variant_count = 3: ba job, cùng nhóm, khoá riêng, credit cộng dồn", async () => {
    const r = await requestCloudVariant(ctx, { ...base, provider: "stability", variantCount: 3, direction: { style: "cinematic" } })
    expect(enqueueJob).toHaveBeenCalledTimes(3)
    const inputs = enqueueJob.mock.calls.map((c) => c[1] as { idempotencyKey: string; jobGroupId?: string; payload: Record<string, unknown> })
    expect(new Set(inputs.map((i) => i.idempotencyKey)).size).toBe(3)
    expect(new Set(inputs.map((i) => i.jobGroupId))).toEqual(new Set([candidateGroupId("org-1", "k-1")]))
    expect(inputs.map((i) => i.payload.candidate_index)).toEqual([1, 2, 3])
    expect(inputs.every((i) => i.payload.style === "cinematic")).toBe(true)
    expect(r.usage.costCredit).toBe(6)
    expect(r.usage.balanceAfter).toBe(94)
    expect(r.jobGroupId).toBe(candidateGroupId("org-1", "k-1"))
    expect(r.job.id).toBe("job-1")
  })

  it("job_group_id tất định theo khoá — gửi lại không đẻ nhóm mới", () => {
    expect(candidateGroupId("org-1", "k")).toBe(candidateGroupId("org-1", "k"))
    expect(candidateGroupId("org-1", "k")).not.toBe(candidateGroupId("org-2", "k"))
    expect(candidateGroupId("org-1", "k")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe("hằng phong cách TS ↔ worker Python không lệch", () => {
  it("VARIANT_STYLES = PHONG_CACH (providers/background/base.py)", () => {
    const src = readFileSync(path.join(ROOT, "workers/media_ai/providers/background/base.py"), "utf8")
    const m = src.match(/^PHONG_CACH = \(([^)]*)\)/m)
    const py = m ? [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]) : null
    expect(py).toEqual([...VARIANT_STYLES])
  })
})
