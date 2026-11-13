import { describe, expect, it } from "vitest"
import { noPurchaseMessage } from "./material-needs"

describe("Dự toán không còn gì phải mua", () => {
  it("mọi mẫu đều chưa có công thức → không báo tồn kho đã đủ", () => {
    expect(noPurchaseMessage(0, 2)).not.toMatch(/đã đủ/)
    expect(noPurchaseMessage(0, 2)).toMatch(/chưa có công thức/)
  })
  it("một phần chưa có công thức → nói rõ phạm vi", () => {
    expect(noPurchaseMessage(3, 1)).toMatch(/đã có công thức/)
  })
  it("đủ công thức và đủ tồn → tồn kho đã đủ", () => {
    expect(noPurchaseMessage(3, 0)).toBe("Tồn kho đã đủ cho các đơn này.")
  })
})
