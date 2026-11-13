import { describe, expect, it } from "vitest"
import { parseProductMatrix } from "@/components/products/bulk-import/parse-product-sheet"
import { toBatchItem } from "@/components/products/bulk-import/run-bulk-import"

const H = ["Mã SKU *", "Tên sản phẩm *", "Giá bán", "Kiểu giá", "Giá cao điểm (VNĐ)", "Nhóm đặc điểm 1", "Giá trị 1", "Nhóm đặc điểm 2", "Giá trị 2", "Đang bán"]

describe("nhập Excel — kiểu giá", () => {
  it("Khoảng giá: các dòng cùng mã gộp thành một sản phẩm nhiều phiên bản", () => {
    const rows = parseProductMatrix([
      H,
      ["B1", "Bó hồng", 300000, "Khoảng giá", 350000, "Kích cỡ", "Nhỏ", "Màu", "Đỏ", ""],
      ["B1", "", 500000, "Khoảng giá", "", "Kích cỡ", "Lớn", "Màu", "Đỏ", "Có"],
      ["B1", "", 320000, "khoang gia", "", "Kích cỡ", "Nhỏ", "Màu", "Trắng", "Không"],
    ])
    expect(rows).toHaveLength(1)
    const r = rows[0]!
    expect([r.status === "ERROR", r.variantCount]).toEqual([false, 3])
    expect(r.pricing?.rows.map((x) => [x.values.join("/"), x.priceVnd, x.active])).toEqual([
      ["Nhỏ/Đỏ", 300000, true],
      ["Nhỏ/Trắng", 320000, false],
      ["Lớn/Đỏ", 500000, true],
      ["Lớn/Trắng", null, false],
    ])
    const attrs = toBatchItem(r, null).attributes as Record<string, unknown>
    expect(attrs.price).toBe(300000)
    expect((attrs.pricing as { mode: string }).mode).toBe("RANGE")
  })

  it("Liên hệ và kiểu giá sai", () => {
    const rows = parseProductMatrix([H, ["C1", "Kệ hoa", "", "Liên hệ"], ["C2", "Giỏ hoa", 1, "Tuỳ ý"]])
    expect(rows[0]!.pricing?.mode).toBe("CONTACT")
    expect(rows[1]!.status).toBe("ERROR")
  })

  it("Khoảng giá thiếu nhóm đặc điểm hoặc lệch nhóm → lỗi", () => {
    const a = parseProductMatrix([H, ["B2", "X", 1000, "Khoảng giá"]])
    expect(a[0]!.errorMsg).toContain("Nhóm đặc điểm 1")
    const b = parseProductMatrix([H, ["B3", "X", 1000, "Khoảng giá", "", "Kích cỡ", "Nhỏ"], ["B3", "", 2000, "Khoảng giá", "", "Màu", "Đỏ"]])
    expect(b[0]!.errorMsg).toContain("cùng nhóm")
  })

  it("không có cột Kiểu giá: giữ cách cũ, mã trùng vẫn báo lỗi, không ghi đè kiểu giá đã khai", () => {
    const rows = parseProductMatrix([["Mã SKU *", "Tên sản phẩm *", "Giá bán"], ["D1", "A", 1000], ["D1", "B", 2000]])
    expect(rows[0]!.pricing).toBeUndefined()
    expect(rows[1]!.status).toBe("ERROR")
    expect("pricing" in (toBatchItem(rows[0]!, null).attributes as Record<string, unknown>)).toBe(false)
  })
})
