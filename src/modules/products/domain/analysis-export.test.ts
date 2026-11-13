import { describe, expect, it } from "vitest"

import { COT_XUAT, dongXuatCuaPhanTich, dungCsv, type AnalysisDeXuat } from "./analysis-export"

const goc: AnalysisDeXuat = {
  id: "pa-1",
  asset_id: "as-1",
  job_id: "job-1",
  product_id: null,
  approval_state: "PENDING",
  approved_by: null,
  approved_at: null,
  created_at: "2026-09-11T03:00:00.000Z",
  provider: "openai_structured",
  model: "gpt-4o",
  contract_version: "1",
  raw: {
    identity: { category: "Sản phẩm" },
    confidence: 82,
    flower_count: 17,
    bud_count: 3,
    damaged_count: 1,
    bom: {
      flowers: [{ name: "Hồng đỏ", ma: "H001", mau: "TM01 Đỏ", quantity: 17, dvt_dem: "Cành", confidence: 88 }],
      foliage: [{ name: "Bạch đàn", quantity: null, mau: "TM05 Xanh lá", confidence: 70 }],
      accessories: [],
      wrapping: [{ layer: "Lớp ngoài", material: "Giấy kraft", color: "Nâu", confidence: 75 }],
    },
  },
  edited: null,
}

describe("dongXuatCuaPhanTich", () => {
  it("một dòng cho mỗi cấu phần, không gộp bom vào một ô", () => {
    const dong = dongXuatCuaPhanTich(goc)
    expect(dong).toHaveLength(3)
    expect(dong.map((d) => d.nhom_cau_phan)).toEqual(["Hoa", "Lá", "Vật liệu gói"])
  })

  it("ba tổng đếm lặp trên mọi dòng của cùng một ảnh để lọc và cộng được", () => {
    const dong = dongXuatCuaPhanTich(goc)
    expect(dong.every((d) => d.so_hoa === "17" && d.so_nu === "3" && d.so_hong === "1")).toBe(true)
  })

  it("nguồn là máy khi chưa ai sửa", () => {
    expect(dongXuatCuaPhanTich(goc)[0]!.nguon).toBe("máy")
  })

  it("nguồn là người và số lấy theo bản sửa khi đã có edited", () => {
    const daSua: AnalysisDeXuat = {
      ...goc,
      edited: {
        ...goc.raw,
        flower_count: 15,
        bom: { ...(goc.raw.bom as object), flowers: [{ name: "Hồng đỏ", quantity: 15 }] },
      },
    }
    const dong = dongXuatCuaPhanTich(daSua)
    expect(dong[0]!.nguon).toBe("người")
    expect(dong[0]!.so_luong).toBe("15")
    expect(dong[0]!.so_hoa).toBe("15")
  })

  it("lượt không nhận ra cấu phần nào vẫn có mặt trong bản xuất", () => {
    const rong: AnalysisDeXuat = { ...goc, raw: { identity: {}, bom: { flowers: [] } } }
    const dong = dongXuatCuaPhanTich(rong)
    expect(dong).toHaveLength(1)
    expect(dong[0]!.ten_cau_phan).toBe("")
  })

  it("lá giữ ô số lượng trống đúng quy ước đếm, không hoá thành 0", () => {
    const la = dongXuatCuaPhanTich(goc).find((d) => d.nhom_cau_phan === "Lá")
    expect(la!.so_luong).toBe("")
  })

  it("hình dạng lạ không làm vỡ — đầu ra AI đọc phòng thủ", () => {
    const hong: AnalysisDeXuat = { ...goc, raw: { bom: "khong-phai-doi-tuong" }, edited: null }
    expect(() => dongXuatCuaPhanTich(hong)).not.toThrow()
  })
})

describe("dungCsv", () => {
  it("mở đầu bằng BOM để Excel đọc đúng tiếng Việt", () => {
    expect(dungCsv(dongXuatCuaPhanTich(goc)).charCodeAt(0)).toBe(0xfeff)
  })

  it("dòng đầu là đủ tên cột", () => {
    const csv = dungCsv([])
    expect(csv.slice(1).trim()).toBe(COT_XUAT.join(","))
  })

  it("bọc ô chứa dấu phẩy và nhân đôi nháy kép", () => {
    const dong = dongXuatCuaPhanTich({
      ...goc,
      raw: { ...goc.raw, bom: { flowers: [{ name: 'Hồng "đỏ", loại A', quantity: 3 }] } },
    })
    expect(dungCsv(dong)).toContain('"Hồng ""đỏ"", loại A"')
  })

  it("kết thúc dòng bằng CRLF — Excel trên Windows cần đúng cặp này", () => {
    expect(dungCsv(dongXuatCuaPhanTich(goc))).toContain("\r\n")
  })
})
