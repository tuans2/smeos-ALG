import { describe, expect, it } from "vitest"

import schema from "../../../../../workers/vision/contracts/Schema.json"
import {
  chuanHoaDoTinCay,
  duDeSinhCauChu,
  projectAnalysisForCopy,
  toneChuDao,
} from "../analysis-projection"

const PHAN_TICH = {
  identity: {
    category: "Sản phẩm",
    shape: "tròn",
    facing: "một mặt",
    container: "giấy gói",
    phong_cach: "Cổ điển",
    dip_su_dung: "Kỷ niệm",
  },
  bom: {
    flowers: [
      { name: "Hồng đỏ", quantity: 20, mau: "đỏ", mo_ta_mau: "đỏ nhung", so_nu: 2, so_hong: 1 },
      { nhom_hoa: "Cẩm tú cầu", quantity: 3, mau: "xanh nhạt" },
    ],
    foliage: [{ name: "Lá bạc", quantity: 5 }],
    accessories: [{ name: "Nơ lụa", quantity: 1 }],
    wrapping: [{ layer: "ngoài", material: "giấy kraft", color: "nâu" }],
  },
  palette_accounting: [
    { cluster_index: 0, nhom: "đỏ", thuoc_ve: "hoa", confidence: 92 },
    { cluster_index: 1, nhom: "xanh lá", thuoc_ve: "lá", confidence: 80 },
  ],
  flower_count: 23,
  bud_count: 2,
  damaged_count: 1,
  confidence: 90,
}

describe("hình chiếu hợp đồng Vision cho bước sinh câu chữ", () => {
  it("đọc đúng tên trường mà hợp đồng thật khai", () => {
    const hc = projectAnalysisForCopy(PHAN_TICH)

    expect(hc.identity.phong_cach).toBe("Cổ điển")
    expect(hc.identity.dip_su_dung).toBe("Kỷ niệm")
    expect(hc.identity.category).toBe("Sản phẩm")
    expect(hc.identity.container).toBe("giấy gói")
  })

  it("hai trường phong cách và dịp có thật trong Schema.json", () => {
    const identity = (
      (schema as { schema?: { properties?: Record<string, { properties?: Record<string, unknown> }> } })
        .schema ?? (schema as { properties?: Record<string, { properties?: Record<string, unknown> }> })
    ).properties?.identity?.properties as Record<string, unknown>

    expect(Object.keys(identity)).toEqual(expect.arrayContaining(["phong_cach", "dip_su_dung"]))
    // Hai tên mà mã cũ đọc KHÔNG có trong hợp đồng — đó là toàn bộ lý do
    // tệp hình chiếu này tồn tại.
    expect(Object.keys(identity)).not.toContain("style")
    expect(Object.keys(identity)).not.toContain("color_tone")
  })

  it("ba tổng đếm lấy ở mức trên cùng, không lấy trong identity", () => {
    const hc = projectAnalysisForCopy(PHAN_TICH)
    expect(hc.flower_count).toBe(23)
    expect(hc.bud_count).toBe(2)
    expect(hc.damaged_count).toBe(1)
  })

  it("độ tin cậy giữ nguyên thang 0–100 của hợp đồng", () => {
    expect(projectAnalysisForCopy(PHAN_TICH).confidence).toBe(90)
    expect(chuanHoaDoTinCay(55)).toBe(55)
    expect(chuanHoaDoTinCay(90.4)).toBe(90)
    expect(chuanHoaDoTinCay(9000)).toBe(100)
    expect(chuanHoaDoTinCay(-5)).toBe(0)
    expect(chuanHoaDoTinCay(null)).toBeNull()
    expect(chuanHoaDoTinCay("90")).toBeNull()
  })

  it("tone chủ đạo gom từ bảng màu đã đo rồi tới màu từng dòng hoa, tối đa ba", () => {
    expect(toneChuDao(PHAN_TICH)).toEqual(["đỏ", "xanh lá", "đỏ nhung"])
  })

  it("dòng hoa thiếu name thì lấy nhóm hoa, không để trống", () => {
    const hc = projectAnalysisForCopy(PHAN_TICH)
    expect(hc.bom.flowers[1]?.name).toBe("Cẩm tú cầu")
  })

  it("đọc phòng thủ: đầu vào hỏng không ném lỗi", () => {
    for (const xau of [null, undefined, "chuỗi", 42, [], { identity: null, bom: "hỏng" }]) {
      const hc = projectAnalysisForCopy(xau)
      expect(hc.bom.flowers).toEqual([])
      expect(hc.identity.category).toBeNull()
      expect(duDeSinhCauChu(hc)).toBe(false)
    }
  })

  it("có nhận dạng hoặc có định mức là đủ để sinh câu chữ", () => {
    expect(duDeSinhCauChu(projectAnalysisForCopy(PHAN_TICH))).toBe(true)
    expect(
      duDeSinhCauChu(projectAnalysisForCopy({ bom: { flowers: [{ name: "Hồng", quantity: 1 }] } }))
    ).toBe(true)
  })
})
