import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import type { VoucherBatchInput } from "../../domain/voucher-batch"
import type { IVoucherBatchRepository, VoucherBatchSummary } from "../../domain/repositories/voucher-batch-repository.interface"
import { getVoucherBatch, issueVoucherBatch, setVoucherBatchActive } from "../voucher-batches"

const ctx = { organizationId: "org-a", userId: "u1" } as TenantContext
const policy = async () => ({ promotions: [{ id: "promo-tet", title: "Ưu đãi Tết", customerText: "", kind: "PERCENT_OFF" as const, percent: 10 }], maxDiscountPercent: 50 })

const summary = (codes: readonly string[]): VoucherBatchSummary => ({
  id: "b1", name: "Tết", promotionId: "promo-tet", codePrefix: null, discountType: "PERCENTAGE", discountValue: 10, minOrderVnd: 0,
  maxDiscountVnd: null, startsAt: null, expiresAt: null, usageLimit: 1, perCustomerLimit: null, isActive: true, createdAt: new Date(),
  codeCount: codes.length, exhaustedCount: 0, usedTotal: 0, sampleCode: null,
})

function repo(existing: string[] = []): IVoucherBatchRepository & { created: string[][] } {
  const created: string[][] = []
  return {
    created,
    existingCodes: vi.fn(async (_ctx, codes: readonly string[]) => new Set(codes.filter((c) => existing.includes(c)))),
    createBatch: vi.fn(async (_ctx, _input, codes: readonly string[]) => { created.push([...codes]); return summary(codes) }),
    listBatches: vi.fn(async () => []),
    findBatch: vi.fn(async () => null),
    listCodes: vi.fn(async () => []),
    setBatchActive: vi.fn(async () => false),
  }
}

const input = (over: Partial<VoucherBatchInput> = {}): VoucherBatchInput => ({
  name: "Tết", mode: "UNIQUE", sharedCode: null, codePrefix: "tet", quantity: 20, promotionId: "promo-tet",
  discountType: "PERCENTAGE", discountValue: 10, minOrderVnd: 0, maxDiscountVnd: null,
  startsAt: null, expiresAt: null, usageLimit: 1, perCustomerLimit: null, ...over,
})

describe("phát hành đợt mã giảm giá", () => {
  it("sinh đủ mã riêng có tiền tố, gắn ưu đãi đang bật", async () => {
    const r = repo()
    const batch = await issueVoucherBatch(ctx, input(), r, policy)
    expect(r.created[0]).toHaveLength(20)
    expect(r.created[0]!.every((c) => c.startsWith("TET-"))).toBe(true)
    expect(batch.promotionTitle).toBe("Ưu đãi Tết")
  })

  it("mã chung đã có → lỗi theo trường, không tạo", async () => {
    const r = repo(["TET2027"])
    await expect(issueVoucherBatch(ctx, input({ mode: "SHARED", sharedCode: "tet2027", quantity: 1 }), r, policy)).rejects.toMatchObject({
      code: "VALIDATION_FAILED", details: { sharedCode: expect.stringContaining("TET2027") },
    })
    expect(r.created).toHaveLength(0)
  })

  it("vượt trần % hoặc gắn ưu đãi đang tắt → từ chối ở máy chủ", async () => {
    await expect(issueVoucherBatch(ctx, input({ discountValue: 70 }), repo(), policy)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(issueVoucherBatch(ctx, input({ promotionId: "promo-cu" }), repo(), policy)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("đợt không thuộc tổ chức → 404", async () => {
    await expect(getVoucherBatch(ctx, "b-khac", repo(), policy)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(setVoucherBatchActive(ctx, "b-khac", false, repo())).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
