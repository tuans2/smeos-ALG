import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { vnCalendarDate, vnDayBounds } from "@/lib/vn-date"
import { generateOrderCode } from "@/modules/orders/domain/order-rules"
import type { IOrderRepository } from "@/modules/orders/domain/repositories/order-repository.interface"
import { createOrder, ORDER_CODE_ATTEMPTS } from "@/modules/orders/use-cases/create-order"

/** Audit BL-10 (06/11/2026): mã đơn theo giờ máy chủ (UTC) và không thử lại khi hai đơn trùng mã. */
const ctx: TenantContext = { userId: "u", organizationId: "org-1", workspaceId: "ws", branchId: null, capabilities: new Set(["R2"]) }
const unique = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" })

describe("ngày Việt Nam", () => {
  it("23:30 UTC là ngày hôm sau ở Việt Nam", () => {
    expect(vnCalendarDate(new Date("2026-11-06T23:30:00Z"))).toEqual({ year: 2026, month: 11, day: 7 })
    expect(generateOrderCode(1, new Date("2026-11-06T23:30:00Z"))).toBe("DH261107-0001")
  })

  it("ranh giới ngày là 00:00 giờ Việt Nam", () => {
    const { start, end } = vnDayBounds(new Date("2026-11-07T05:00:00Z"))
    expect(start.toISOString()).toBe("2026-11-06T17:00:00.000Z")
    expect(end.toISOString()).toBe("2026-11-07T17:00:00.000Z")
  })
})

describe("createOrder — trùng mã", () => {
  const items = [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 300_000 }]

  function repoWith(create: ReturnType<typeof vi.fn>) {
    return { countTodayOrders: vi.fn().mockResolvedValue(4), create } as unknown as IOrderRepository
  }

  it("trùng mã → thử số kế tiếp", async () => {
    const create = vi.fn().mockRejectedValueOnce(unique()).mockImplementation(async (_o: string, code: string) => ({ id: "o", code }))
    const order = await createOrder(ctx, { items }, repoWith(create), vi.fn(), vi.fn(async () => []), vi.fn(async () => undefined), vi.fn())
    expect(create).toHaveBeenCalledTimes(2)
    expect((create.mock.calls[0] as unknown[])[1]).toMatch(/-0005$/)
    expect(order.code).toMatch(/-0006$/)
  })

  it("trùng mãi → 409 sau số lần có giới hạn, không 500", async () => {
    const create = vi.fn().mockRejectedValue(unique())
    await expect(createOrder(ctx, { items }, repoWith(create), vi.fn(), vi.fn(async () => []), vi.fn(async () => undefined), vi.fn())).rejects.toMatchObject({ code: "CONFLICT" })
    expect(create).toHaveBeenCalledTimes(ORDER_CODE_ATTEMPTS)
  })

  it("lỗi khác không bị nuốt", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db down"))
    await expect(createOrder(ctx, { items }, repoWith(create), vi.fn(), vi.fn(async () => []), vi.fn(async () => undefined), vi.fn())).rejects.toThrow("db down")
    expect(create).toHaveBeenCalledTimes(1)
  })
})

describe("createOrder — giá sàn với đơn nhân viên nhập tay (audit BL-07)", () => {
  const repo = () => ({ countTodayOrders: vi.fn().mockResolvedValue(0), create: vi.fn(async (_o: string, code: string) => ({ id: "o", code })) }) as unknown as IOrderRepository
  const noForeign = vi.fn(async () => [])

  it("đơn MANUAL: kiểm sàn trên các dòng có sản phẩm, theo tổng tiền của chính các dòng đó", async () => {
    const floor = vi.fn(async () => undefined)
    await createOrder(ctx, { source: "MANUAL", items: [
      { productId: "p1", quantity: 2, unitPriceVnd: 100_000 },
      { description: "Thiệp", quantity: 1, unitPriceVnd: 900_000 },
    ] }, repo(), vi.fn(), noForeign, floor, vi.fn())
    expect(floor).toHaveBeenCalledWith(ctx, [{ productId: "p1", quantity: 2 }], 200_000, 200_000)
  })

  it("dưới sàn → lỗi của bộ kiểm sàn, không tạo đơn", async () => {
    const r = repo()
    const floor = vi.fn(async () => { throw Object.assign(new Error("Giá thấp hơn giá sàn"), { code: "UNPROCESSABLE_ENTITY" }) })
    await expect(createOrder(ctx, { source: "MANUAL", items: [{ productId: "p1", quantity: 1, unitPriceVnd: 1 }] }, r, vi.fn(), noForeign, floor, vi.fn())).rejects.toThrow("giá sàn")
    expect(r.create).not.toHaveBeenCalled()
  })

  it("đơn từ chat (giá báo sau) không kiểm sàn lúc tạo", async () => {
    const floor = vi.fn(async () => undefined)
    await createOrder(ctx, { source: "CHAT", items: [{ productId: "p1", quantity: 1, unitPriceVnd: 0 }] }, repo(), vi.fn(), noForeign, floor, vi.fn())
    expect(floor).not.toHaveBeenCalled()
  })

  it("đơn MANUAL giá 0 (nháp chờ báo giá) không kiểm sàn lúc tạo", async () => {
    const floor = vi.fn(async () => undefined)
    await createOrder(ctx, { source: "MANUAL", items: [{ productId: "p1", quantity: 1, unitPriceVnd: 0 }] }, repo(), vi.fn(), noForeign, floor, vi.fn())
    expect(floor).not.toHaveBeenCalled()
  })
})
