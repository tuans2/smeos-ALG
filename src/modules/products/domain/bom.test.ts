import { describe, it, expect } from "vitest"
import { normalizeProductBom, extractComponentNames } from "./bom"

describe("Generic BOM Domain", () => {
  it("chuẩn hóa hoàn hảo từ Legacy Floral BOM", () => {
    const legacyBom = {
      flowers: [
        { name: "Hồng Ohara", quantity: 10, unit: "cành", role: "PRIMARY" },
        { nhom_hoa: "Baby trắng", so_luong: 1, don_vi: "bó" },
      ],
      foliage: [
        { loai_la: "Lá bạc", so_luong: 3, don_vi: "nhánh" },
      ],
      wrapping: [
        { material: "Giấy xi măng", color: "nâu" },
      ],
    }

    const normalized = normalizeProductBom(legacyBom)
    expect(normalized.components).toHaveLength(3)
    expect(normalized.components[0]).toEqual({
      name: "Hồng Ohara",
      quantity: 10,
      unit: "cành",
      role: "PRIMARY",
    })
    expect(normalized.components[1]).toEqual({
      name: "Baby trắng",
      quantity: 1,
      unit: "bó",
      role: "PRIMARY",
    })
    expect(normalized.components[2]).toEqual({
      name: "Lá bạc",
      quantity: 3,
      unit: "nhánh",
      role: "FOLIAGE",
    })
    expect(normalized.packaging).toBeDefined()
    expect(normalized.packaging?.[0]?.name).toBe("Giấy xi măng nâu")
  })

  it("chuẩn hóa đúng dữ liệu BOM của ngành Thời trang", () => {
    const fashionBom = {
      components: [
        { name: "Vải lụa satin", quantity: 2.5, unit: "mét", role: "PRIMARY", costVnd: 250000 },
        { name: "Khóa kéo YKK giọt nước", quantity: 1, unit: "cái", role: "HARDWARE" },
        { name: "Cúc ngọc trai", quantity: 6, unit: "cái", role: "ACCESSORY" },
      ],
      packaging: [
        { name: "Hộp giấy kraft cao cấp", quantity: 1, unit: "hộp" },
      ],
    }

    const normalized = normalizeProductBom(fashionBom)
    expect(normalized.components).toHaveLength(3)
    expect(normalized.components[0]?.costVnd).toBe(250000)
    expect(extractComponentNames(fashionBom)).toEqual([
      "Vải lụa satin",
      "Khóa kéo YKK giọt nước",
      "Cúc ngọc trai",
    ])
  })

  it("chuẩn hóa đúng dữ liệu BOM của ngành FnB", () => {
    const fnbBom = {
      components: [
        { name: "Bột mì số 11", quantity: 500, unit: "gram", role: "PRIMARY" },
        { name: "Bơ Anchor", quantity: 200, unit: "gram", role: "SECONDARY" },
        { name: "Hạnh nhân lát", quantity: 50, unit: "gram", role: "TOPPING" },
      ],
    }

    const normalized = normalizeProductBom(fnbBom)
    expect(normalized.components).toHaveLength(3)
    expect(normalized.components[1]?.quantity).toBe(200)
    expect(normalized.components[1]?.unit).toBe("gram")
  })

  it("xử lý an toàn khi đầu vào rỗng hoặc null", () => {
    expect(normalizeProductBom(null).components).toEqual([])
    expect(normalizeProductBom(undefined).components).toEqual([])
    expect(extractComponentNames({})).toEqual([])
  })
})
