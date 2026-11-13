import { describe, expect, it } from "vitest"
import { productIdsOfCatalogs, withoutProducts } from "../use-excluded-catalog-products"

const detail = (ids: string[]) => ({ data: { items: ids.map((id) => ({ product: { id } })) } })

describe("lọc không trùng mẫu với bộ sưu tập khác", () => {
  it("gộp mẫu của mọi bộ sưu tập đã chọn", () => {
    expect([...productIdsOfCatalogs([detail(["a", "b"]), detail(["b", "c"])])].sort()).toEqual(["a", "b", "c"])
  })

  it("ẩn mẫu đã có trong các bộ đã chọn, giữ mẫu còn lại", () => {
    const products = [{ id: "a" }, { id: "b" }, { id: "d" }]
    expect(withoutProducts(products, new Set(["a", "b"]))).toEqual([{ id: "d" }])
  })

  it("chưa chọn bộ nào → danh sách giữ nguyên", () => {
    const products = [{ id: "a" }]
    expect(withoutProducts(products, new Set())).toBe(products)
  })
})
