import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "../../domain/order-types"
import { ingestOrder, type IngestOrderDeps, type IngestOrderInput } from "../ingest-order"

const ctx = { organizationId: "org-1", userId: "user-1", capabilities: new Set<string>() } as unknown as TenantContext
const items = [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }]

function deps(member = true): IngestOrderDeps & { create: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn(async (_ctx, input) => ({ id: "o-1", code: "DH-1", source: input.source }) as unknown as OrderRecord),
    isActiveMember: vi.fn(async () => member),
  }
}

describe("ingestOrder — cổng nhận đơn chung", () => {
  it("chuyển đơn kèm nguồn, lead và sale phụ trách xuống tầng tạo đơn", async () => {
    const d = deps()
    const input: IngestOrderInput = { source: "LANDING", items, leadId: "lead-1", ownerSaleId: "sale-1" }
    await ingestOrder(ctx, input, d)
    expect(d.isActiveMember).toHaveBeenCalledWith("org-1", "sale-1")
    expect(d.create).toHaveBeenCalledWith(ctx, input)
  })

  it("Thẻ chào không được đi qua cổng chung (đóng băng — B1)", async () => {
    const d = deps()
    await expect(ingestOrder(ctx, { source: "BROCHURE", items }, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.create).not.toHaveBeenCalled()
  })

  it("mã nguồn lạ bị từ chối", async () => {
    const d = deps()
    await expect(ingestOrder(ctx, { source: "ORDER_M10" as never, items }, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.create).not.toHaveBeenCalled()
  })

  it("sale phụ trách không thuộc cửa hàng → từ chối, không tạo đơn", async () => {
    const d = deps(false)
    await expect(ingestOrder(ctx, { source: "MANUAL", items, ownerSaleId: "x" }, d)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(d.create).not.toHaveBeenCalled()
  })

  it("không có sale phụ trách thì không cần kiểm thành viên", async () => {
    const d = deps(false)
    await ingestOrder(ctx, { source: "CHANNEL", items }, d)
    expect(d.isActiveMember).not.toHaveBeenCalled()
    expect(d.create).toHaveBeenCalledOnce()
  })

  it("nhận đơn từ nguồn QUOTATION (Báo giá)", async () => {
    const d = deps()
    const input: IngestOrderInput = { source: "QUOTATION", items, leadId: "lead-q1" }
    const result = await ingestOrder(ctx, input, d)
    expect(d.create).toHaveBeenCalledWith(ctx, input)
    expect(result.source).toBe("QUOTATION")
  })
})
