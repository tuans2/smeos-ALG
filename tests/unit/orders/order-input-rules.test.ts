import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { isPastVnDate, isVietnamPhone, newOrderDeliveryErrors } from "@/modules/orders/domain/order-input-rules"
import type { IOrderRepository } from "@/modules/orders/domain/repositories/order-repository.interface"
import { createOrder } from "@/modules/orders/use-cases/create-order"

/** PO 07/11/2026 — Q11: không tạo đơn với ngày giao đã qua; Q12: SĐT người nhận chỉ nhận số Việt Nam. */
describe("luật đầu vào khi tạo đơn", () => {
  const now = new Date("2026-11-07T18:00:00Z") // 01:00 ngày 08/11 giờ Việt Nam

  it("ngày giao so với hôm nay theo giờ Việt Nam", () => {
    expect(isPastVnDate("2026-11-07", now)).toBe(true)
    expect(isPastVnDate("2026-11-08", now)).toBe(false)
    expect(isPastVnDate("2026-12-01", now)).toBe(false)
  })

  it.each(["0912345678", "0912 345 678", "0912.345.678", "+84912345678", "0389-123-456"])("%s là số Việt Nam", (p) => {
    expect(isVietnamPhone(p)).toBe(true)
  })

  it.each(["+14155550100", "0112345678", "091234567", "abc", "+65 8123 4567"])("%s không phải số Việt Nam", (p) => {
    expect(isVietnamPhone(p)).toBe(false)
  })

  it("trả lỗi theo trường, không mã kỹ thuật", () => {
    const e = newOrderDeliveryErrors({ deliveryDate: "2026-11-01", recipientPhone: "+14155550100" }, now)
    expect(Object.keys(e).sort()).toEqual(["deliveryDate", "recipientPhone"])
    expect(newOrderDeliveryErrors({ deliveryDate: "2026-11-08", recipientPhone: "0912345678" }, now)).toEqual({})
    expect(newOrderDeliveryErrors({}, now)).toEqual({})
  })
})

describe("createOrder áp luật Q11/Q12", () => {
  const ctx: TenantContext = { userId: "u", organizationId: "org-1", workspaceId: "ws", branchId: null, capabilities: new Set(["R2"]) }
  const items = [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300_000 }]
  const repo = () => ({ allocateOrderCodeNumber: vi.fn(async () => 1), create: vi.fn(async () => ({ id: "o", code: "DH" })) }) as unknown as IOrderRepository & { create: ReturnType<typeof vi.fn> }
  const run = (input: Parameters<typeof createOrder>[1], r = repo()) =>
    createOrder(ctx, input, r, vi.fn(), vi.fn(async () => []), vi.fn(async () => undefined), vi.fn())

  it("ngày giao đã qua → 400, không tạo đơn", async () => {
    const r = repo()
    await expect(run({ items, deliveryWindow: { date: "2020-01-01" } }, r)).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    expect(r.create).not.toHaveBeenCalled()
  })

  it("SĐT người nhận nước ngoài → 400", async () => {
    await expect(run({ items, deliveryAddress: { recipientName: "An", phone: "+14155550100", street: "1 Lê Lợi" } })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("ngày giao tương lai + số Việt Nam có dấu cách → tạo được", async () => {
    await expect(run({ items, deliveryWindow: { date: "2099-01-01" }, deliveryAddress: { recipientName: "An", phone: "0912 345 678", street: "1 Lê Lợi" } })).resolves.toBeDefined()
  })
})
