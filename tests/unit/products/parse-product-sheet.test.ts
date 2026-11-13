import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"
import {
  findHeaderRow, mapRecordToRow, markDuplicateCodes, parseFlowersText, parsePrice, parseProductMatrix, parseProductWorkbook,
} from "@/components/products/bulk-import/parse-product-sheet"

describe("parse-product-sheet — nhập kho sản phẩm từ Excel", () => {
  it("tìm dòng tiêu đề thật dưới các dòng nhóm của Template Master (tiêu đề 2 tầng)", () => {
    const matrix = [["1. ĐỊNH DANH SẢN PHẨM"], ["Nhóm"], ["Mã SKU Chuẩn (FloraOS) *", "Tên mẫu hoa *"], ["FL-1", "Hồng"]]
    expect(findHeaderRow(matrix)).toBe(2)
    expect(findHeaderRow([["a"], ["b"]])).toBe(0)
  })

  it("giá: số, chuỗi có dấu chấm/phẩy/đ → số nguyên; 'Liên hệ', trống, âm → null", () => {
    expect(parsePrice(450000)).toBe(450000)
    expect(parsePrice(450000.4)).toBe(450000)
    expect(parsePrice("1.500.000")).toBe(1500000)
    expect(parsePrice("1,500,000 đ")).toBe(1500000)
    expect(parsePrice("1500000VNĐ")).toBe(1500000)
    expect(parsePrice("Liên hệ")).toBeNull()
    expect(parsePrice("")).toBeNull()
    expect(parsePrice(-5)).toBeNull()
    expect(parsePrice(null)).toBeNull()
  })

  it("ánh xạ cột mẫu mới và mẫu cũ; thiếu mã/tên → ERROR; có link Drive → DRIVE_SYNC", () => {
    const fresh = mapRecordToRow({ "Mã SKU Chuẩn (FloraOS) *": " FL-1 ", "Tên mẫu hoa *": "Hồng", "Giá niêm yết B2C (VNĐ) *": "350.000", "Link ảnh thành phẩm chuẩn (Drive)": "https://drive.google.com/drive/folders/abc" }, 0)
    expect(fresh).toMatchObject({ index: 1, code: "FL-1", name: "Hồng", price: 350000, status: "DRIVE_SYNC", category: "Sản phẩm" })
    // Tiêu đề mới (đa ngành) cũng được nhận
    expect(mapRecordToRow({ "Mã SKU Chuẩn (FloraOS) *": "SP-1", "Tên sản phẩm *": "Áo thun" }, 0)).toMatchObject({ code: "SP-1", name: "Áo thun" })
    const legacy = mapRecordToRow({ "Mã Lovi": "LV9", "Tên sản phẩm": "Cúc", "Giá bán": 200000 }, 4)
    expect(legacy).toMatchObject({ index: 5, code: "LV9", loviCode: "LV9", price: 200000, status: "NO_IMAGE" })
    expect(mapRecordToRow({ "Tên mẫu hoa": "Không mã" }, 0)).toMatchObject({ status: "ERROR", errorMsg: "Thiếu mã hoặc tên sản phẩm" })
  })

  it("mã trùng trong cùng file → dòng sau là ERROR (không phân biệt hoa thường)", () => {
    const rows = markDuplicateCodes([
      mapRecordToRow({ SKU: "FL-1", name: "A" }, 0),
      mapRecordToRow({ SKU: "fl-1", name: "B" }, 1),
    ])
    expect(rows[0]?.status).toBe("NO_IMAGE")
    expect(rows[1]).toMatchObject({ status: "ERROR", errorMsg: "Trùng mã với dòng 1" })
  })

  it("bỏ dòng ví dụ 'VD:' và dòng trống; file không có dữ liệu → lỗi tiếng Việt", () => {
    const rows = parseProductMatrix([["SKU", "name"], ["VD: FL-0", "Mẫu"], [], ["FL-1", "Hồng"]])
    expect(rows.map((r) => r.code)).toEqual(["FL-1"])
    expect(() => parseProductMatrix([["SKU", "name"]])).toThrow("File không chứa bản ghi dữ liệu sản phẩm hợp lệ.")
    expect(() => parseProductMatrix([])).toThrow("File không chứa dữ liệu sản phẩm.")
  })

  it("đọc được cả .xlsx và .csv UTF-8", () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Mã SKU *", "Tên mẫu hoa"], ["FL-2", "Lan hồ điệp"]]), "S")
    const xlsx = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    expect(parseProductWorkbook(xlsx, "kho.xlsx")[0]).toMatchObject({ code: "FL-2", name: "Lan hồ điệp" })
    const csv = new TextEncoder().encode("SKU,Tên sản phẩm\nFL-3,Cẩm tú cầu\n").buffer as ArrayBuffer
    expect(parseProductWorkbook(csv, "kho.CSV")[0]).toMatchObject({ code: "FL-3", name: "Cẩm tú cầu" })
  })

  it("BOM: tách số lượng + đơn vị, thiếu số → 1 cành", () => {
    expect(parseFlowersText("Hồng đỏ 10 cành; Baby 2 bó, Lá")).toEqual([
      { name: "Hồng đỏ", quantity: 10, unit: "cành", color: "Tiêu chuẩn", role: "Chủ đạo" },
      { name: "Baby", quantity: 2, unit: "bó", color: "Tiêu chuẩn", role: "Chủ đạo" },
      { name: "Lá", quantity: 1, unit: "cành", color: "Tiêu chuẩn", role: "Chủ đạo" },
    ])
    expect(parseFlowersText("  ")).toEqual([])
  })
})
