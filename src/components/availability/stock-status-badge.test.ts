import { describe, expect, it } from "vitest"

import { stockBadge } from "@/components/availability/stock-status-badge"

/** Audit User Journey R2-08: bảng tồn nhanh hiện đúng 3 trạng thái của enum `stock_status`. */
describe("stockBadge", () => {
  it("mỗi trạng thái của máy chủ có nhãn riêng; 'Chỉ đặt trước' không còn hiện thành 'Còn hàng'", () => {
    expect(stockBadge("IN_STOCK").label).toBe("Còn hàng")
    expect(stockBadge("PRE_ORDER_ONLY").label).toBe("Chỉ đặt trước")
    expect(stockBadge("OUT_OF_STOCK").label).toBe("Tạm hết hàng")
  })

  it("thiếu hoặc lạ → còn hàng như trước", () => {
    expect(stockBadge(undefined).label).toBe("Còn hàng")
    expect(stockBadge("LOW_STOCK").label).toBe("Còn hàng")
  })

  it("chỉ dùng token màu đạt tương phản (*-bg / *-text), không opacity", () => {
    for (const s of ["IN_STOCK", "PRE_ORDER_ONLY", "OUT_OF_STOCK"]) {
      expect(stockBadge(s).className).toMatch(/^bg-\w+-bg text-\w+-text$/)
    }
  })
})
