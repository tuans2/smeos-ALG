import { describe, expect, it } from "vitest"

import { applyFieldAdd, applyFieldChange, applyFieldRemove, applyItemChange } from "./analysis-field-edits"

const base = {
  identity: { category: "BO" },
  bom: {
    flowers: [{ id: "f1", name: "Hồng", quantity: 5, dvt_dem: "bông" }, { name: "Cúc", quantity: 3 }],
    foliage: [],
    accessories: [],
    wrapping: [{ layer: "Lớp 1", material: "Giấy" }],
  },
}

describe("sửa Thẻ sản phẩm trước khi duyệt", () => {
  it("đổi trường nhận dạng, ghi chú, checklist mà không đụng phần khác", () => {
    const a = applyFieldChange(base, "category", "GIO")
    expect(a.identity).toEqual({ category: "GIO" })
    expect(a.bom).toBe(base.bom)
    expect(applyFieldChange(base, "checklist.du_anh", "yes").checklist).toEqual({ du_anh: "yes" })
  })

  it("sửa / thêm / xoá thành phần chính tính lại tổng số lượng", () => {
    const edited = applyItemChange(base, "flowers", "f1", { id: "f1", name: "Hồng đỏ", unit: "bông", quantity: 7 })
    expect(edited.total_stems).toBe(10)
    const added = applyFieldAdd(edited, "flowers", { id: "n1", name: "Lan", quantity: 2 })
    expect(added.total_stems).toBe(12)
    const removed = applyFieldRemove(added, "flowers", "flower-1")
    expect(removed.total_stems).toBe(9)
    expect(base.bom.flowers).toHaveLength(2) // không sửa dữ liệu gốc
  })

  it("lớp gói thêm theo thứ tự và xoá theo vị trí", () => {
    const added = applyFieldAdd(base, "wrapping", { id: "w", value: "Lưới" })
    expect((added.bom as { wrapping: unknown[] }).wrapping).toHaveLength(2)
    const removed = applyFieldRemove(added, "wrapping", "wrapping-0")
    expect((removed.bom as { wrapping: Array<{ material: string }> }).wrapping[0]?.material).toBe("Lưới")
  })
})
