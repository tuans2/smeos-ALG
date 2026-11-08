import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IngestOrderInput, OrderRecord } from "../../domain/order-types"
import { ingestOrderOnce, type IngestOnceDeps } from "../ingest-order-once"

const ctx = { organizationId: "org-1", userId: "user-1", branchId: null, capabilities: new Set<string>() } as unknown as TenantContext
const input: IngestOrderInput = { source: "MANUAL", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }] }
const order = (id: string, branchId: string | null = null) => ({ id, code: `DH-${id}`, branchId }) as unknown as OrderRecord

function deps(found: (OrderRecord | null)[] = [null], ingest?: () => Promise<OrderRecord>): IngestOnceDeps & {
  findByKey: ReturnType<typeof vi.fn>
  ingest: ReturnType<typeof vi.fn>
} {
  const findByKey = vi.fn()
  for (const value of found) findByKey.mockResolvedValueOnce(value)
  return { findByKey, ingest: vi.fn(ingest ?? (async () => order("new"))) }
}

describe("ingestOrderOnce — chống bấm đúp POST /orders (audit API-11)", () => {
  it("không có khoá → tạo đơn như trước, không tra khoá", async () => {
    const d = deps()
    expect(await ingestOrderOnce(ctx, input, null, d)).toEqual({ order: order("new"), replayed: false })
    expect(d.findByKey).not.toHaveBeenCalled()
    expect(d.ingest).toHaveBeenCalledWith(ctx, input)
  })

  it("khoá mới → tạo đơn và lưu khoá vào đơn", async () => {
    const d = deps([null])
    expect(await ingestOrderOnce(ctx, input, "k-1", d)).toEqual({ order: order("new"), replayed: false })
    expect(d.findByKey).toHaveBeenCalledWith("org-1", "k-1")
    expect(d.ingest).toHaveBeenCalledWith(ctx, { ...input, idempotencyKey: "k-1" })
  })

  it("khoá đã dùng → trả đơn cũ, không tạo đơn mới", async () => {
    const d = deps([order("old")])
    expect(await ingestOrderOnce(ctx, input, "k-1", d)).toEqual({ order: order("old"), replayed: true })
    expect(d.ingest).not.toHaveBeenCalled()
  })

  it("gửi đồng thời: người thua vỡ ở khoá duy nhất → trả đơn của người thắng", async () => {
    const d = deps([null, order("winner")], async () => {
      throw Object.assign(new Error("unique"), { code: "P2002" })
    })
    expect(await ingestOrderOnce(ctx, input, "k-1", d)).toEqual({ order: order("winner"), replayed: true })
  })

  it("tạo đơn lỗi mà khoá vẫn chưa có đơn → ném lỗi gốc", async () => {
    const boom = new Error("hỏng")
    const d = deps([null, null], async () => {
      throw boom
    })
    await expect(ingestOrderOnce(ctx, input, "k-1", d)).rejects.toBe(boom)
  })

  it("nhân viên chi nhánh: khoá trùng đơn của chi nhánh khác → 409, không lộ đơn", async () => {
    const branchCtx = { ...ctx, branchId: "cn-1" } as unknown as TenantContext
    const d = deps([order("other", "cn-2")])
    await expect(ingestOrderOnce(branchCtx, input, "k-1", d)).rejects.toMatchObject({ code: "CONFLICT" })
    const same = deps([order("mine", "cn-1")])
    expect(await ingestOrderOnce(branchCtx, input, "k-1", same)).toEqual({ order: order("mine", "cn-1"), replayed: true })
  })
})
