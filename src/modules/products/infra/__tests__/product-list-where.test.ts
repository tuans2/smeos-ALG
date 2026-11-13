import { describe, it, expect } from "vitest"
import { categoryAndSearchWhere } from "../product-list-where"

/** Lọc loại hoa + tìm từ khoá cùng lúc: cả hai điều kiện phải giữ (trước đây khoá `OR` sau ghi đè khoá trước). */
describe("categoryAndSearchWhere", () => {
  it("giữ cả bộ lọc loại hoa lẫn từ khoá", () => {
    const where = categoryAndSearchWhere({ category: "Sản phẩm", search: "hồng" }) as { AND: Array<{ OR: unknown[] }> }
    expect(where.AND).toHaveLength(2)
    expect(JSON.stringify(where.AND[0])).toContain("shape")
    expect(JSON.stringify(where.AND[1])).toContain("hồng")
  })

  it("không có bộ lọc → không thêm điều kiện; chuỗi rỗng bị bỏ qua", () => {
    expect(categoryAndSearchWhere({})).toEqual({})
    expect(categoryAndSearchWhere({ category: "  " })).toEqual({})
  })
})
