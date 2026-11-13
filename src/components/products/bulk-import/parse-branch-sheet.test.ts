import * as XLSX from "xlsx"
import { describe, expect, it } from "vitest"
import { generateBranchTemplateBuffer, parseBranchWorkbook } from "./parse-branch-sheet"

function workbook(rows: Record<string, string | number>[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Chi nhánh")
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  return out
}

const base = { "Mã chi nhánh *": "Q1", "Tên chi nhánh *": "Chi nhánh Q1", "Địa chỉ chi tiết *": "1 Lê Lợi" }

describe("parseBranchWorkbook", () => {
  it("ô vĩ độ/kinh độ trống → không có toạ độ (không gán toạ độ Hà Nội)", () => {
    const [row] = parseBranchWorkbook(workbook([base]))
    expect(row?.status).toBe("VALID")
    expect(row?.latitude).toBeUndefined()
    expect(row?.longitude).toBeUndefined()
  })

  it("đọc phường, quận, tỉnh và danh sách phường phục vụ thêm", () => {
    const [row] = parseBranchWorkbook(workbook([{
      ...base, "Phường / Xã": "Phường Bến Nghé", "Quận / Huyện": "Quận 1", "Tỉnh / Thành phố": "TP. Hồ Chí Minh",
      "Phường/xã phục vụ thêm": "Phường Đa Kao; Phường Tân Định", "Vĩ độ (Latitude)": 10.776, "Kinh độ (Longitude)": 106.701,
    }]))
    expect(row).toMatchObject({
      ward: "Phường Bến Nghé", district: "Quận 1", city: "TP. Hồ Chí Minh",
      serviceWards: ["Phường Đa Kao", "Phường Tân Định"], latitude: 10.776, longitude: 106.701,
    })
  })

  it("toạ độ sai → dòng lỗi, không nhập", () => {
    const [row] = parseBranchWorkbook(workbook([{ ...base, "Vĩ độ (Latitude)": "abc", "Kinh độ (Longitude)": 106.7 }]))
    expect(row?.status).toBe("ERROR")
  })

  it("file mẫu có cột Phường / Xã và đọc lại được", () => {
    const rows = parseBranchWorkbook(generateBranchTemplateBuffer().buffer as ArrayBuffer)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]?.ward).toBe("Phường Cống Vị")
  })
})
