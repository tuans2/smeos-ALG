import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IngestOrderInput, OrderRecord } from "../../domain/order-types"
import { ingestOrderOnce, orderBodyHash, type IngestOnceDeps } from "../ingest-order-once"

const ctx = { organizationId: "org-1", userId: "user-1", branchId: null, capabilities: new Set<string>() } as unknown as TenantContext
const input: IngestOrderInput = { source: "MANUAL", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }] }
const order = (id: string, branchId: string | null = null) => ({ id, code: `DH-${id}`, branchId }) as unknown as OrderRecord
const HASH = orderBodyHash(input)
type Found = { order: OrderRecord; bodyHash: string | null } | null
const saved = (o: OrderRecord, bodyHash: string | null = HASH): Found => ({ order: o, bodyHash })

function deps(found: Found[] = [null], ingest?: () => Promise<OrderRecord>): IngestOnceDeps & {
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
    expect(d.ingest).toHaveBeenCalledWith(ctx, { ...input, idempotencyKey: "k-1", idempotencyBodyHash: HASH })
  })

  it("khoá đã dùng → trả đơn cũ, không tạo đơn mới", async () => {
    const d = deps([saved(order("old"))])
    expect(await ingestOrderOnce(ctx, input, "k-1", d)).toEqual({ order: order("old"), replayed: true })
    expect(d.ingest).not.toHaveBeenCalled()
  })

  it("gửi đồng thời: người thua vỡ ở khoá duy nhất → trả đơn của người thắng", async () => {
    const d = deps([null, saved(order("winner"))], async () => {
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
    const d = deps([saved(order("other", "cn-2"))])
    await expect(ingestOrderOnce(branchCtx, input, "k-1", d)).rejects.toMatchObject({ code: "CONFLICT" })
    const same = deps([saved(order("mine", "cn-1"))])
    expect(await ingestOrderOnce(branchCtx, input, "k-1", same)).toEqual({ order: order("mine", "cn-1"), replayed: true })
  })

  it("cùng khoá mà thân khác (PO 11/11/2026) → 422 IDEMPOTENCY_KEY_REUSED kèm order_id, không tạo đơn", async () => {
    const d = deps([saved(order("old"), orderBodyHash({ ...input, cardMessage: "khác" }))])
    await expect(ingestOrderOnce(ctx, input, "k-1", d)).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", details: { order_id: "old" } })
    expect(d.ingest).not.toHaveBeenCalled()
  })

  it("đơn tạo trước khi có cột băm (băm NULL) → vẫn trả đơn cũ như trước", async () => {
    const d = deps([saved(order("legacy"), null)])
    expect(await ingestOrderOnce(ctx, input, "k-1", d)).toEqual({ order: order("legacy"), replayed: true })
  })

  it("băm không phụ thuộc thứ tự khoá trong thân", () => {
    const a = { source: "MANUAL" as const, cardMessage: "Chúc mừng", items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 1 }] }
    const b = { items: [{ unitPriceVnd: 1, quantity: 1, description: "Bó hồng" }], cardMessage: "Chúc mừng", source: "MANUAL" as const }
    expect(orderBodyHash(a)).toBe(orderBodyHash(b))
    expect(orderBodyHash(a)).not.toBe(orderBodyHash({ ...a, cardMessage: "Khác" }))
  })
})
