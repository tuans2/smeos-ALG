import { describe, expect, it, vi } from "vitest"

import { expireUnpaidOrders } from "../expire-unpaid-orders"

describe("expireUnpaidOrders (UJ-12)", () => {
  it("huỷ bằng ngữ cảnh hệ thống có quyền huỷ; lỗi một đơn không chặn đơn khác", async () => {
    const cancel = vi.fn(async (_ctx: { capabilities: ReadonlySet<string> }, id: string) => {
      if (id === "o-2") throw new Error("đơn vừa đổi")
    })
    const result = await expireUnpaidOrders(new Date(), {
      list: async () => [
        { organizationId: "org-a", orderId: "o-1" },
        { organizationId: "org-a", orderId: "o-2" },
        { organizationId: "org-b", orderId: "o-3" },
      ],
      cancel,
    })
    expect(result).toEqual({ cancelled: 2, failed: 1 })
    expect(cancel.mock.calls[0]?.[0].capabilities.has("R6")).toBe(true)
  })

  it("không đọc được danh sách → null", async () => {
    expect(await expireUnpaidOrders(new Date(), { list: async () => { throw new Error("mất kết nối") }, cancel: vi.fn() })).toBeNull()
  })
})
