import { describe, expect, it } from "vitest"
import { changeRequestExpiresAt, hasConflict, pickChanges, selectFields } from "@/modules/products/domain/product-change-request"

const current = { name: "Bó", code: "A1", category: null, shape: null, facing: null, container: null, attributes: { price: 1 } }

describe("đề xuất sửa — pickChanges / selectFields", () => {
  it("chỉ giữ trường thật sự khác", () => {
    expect(pickChanges(current, { name: "Bó", code: "A2", attributes: { price: 1 } })).toEqual({ code: "A2" })
    expect(pickChanges(current, { attributes: { price: 2 } })).toEqual({ attributes: { price: 2 } })
    expect(pickChanges(current, {})).toEqual({})
  })

  it("duyệt một phần chỉ áp trường được chọn; trường lạ bị bỏ", () => {
    const changes = { name: "X", code: "Y" }
    expect(selectFields(changes, ["name", "khong-co"])).toEqual({ applied: { name: "X" }, partial: true })
    expect(selectFields(changes, [])).toEqual({ applied: changes, partial: false })
    expect(selectFields(changes, null)).toEqual({ applied: changes, partial: false })
  })

  it("xung đột khi bản gốc đổi sau lúc gửi; hạn 30 ngày", () => {
    const base = new Date("2026-10-23T00:00:00Z")
    expect(hasConflict(base, base)).toBe(false)
    expect(hasConflict(base, new Date(base.getTime() + 1))).toBe(true)
    expect(changeRequestExpiresAt(base).toISOString()).toBe("2026-11-22T00:00:00.000Z")
  })
})
