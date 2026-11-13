import { describe, expect, it } from "vitest"

import {
  mergeSalesDataIntoAttributes,
  preservedKeys,
  SALES_DATA_KEY,
  type SalesData,
} from "../product-master-merge"

const SALES: SalesData = {
  description: "Sản phẩm hồng đỏ cho ngày kỷ niệm",
  tags: ["hoa-hong", "ky-niem"],
  occasions: ["Kỷ niệm"],
  occasionCodes: ["anniversary"],
  priceSegment: "standard",
}

/** Đúng hình dạng mà `extractProductFieldsFromAnalysis` ghi lúc duyệt M01. */
const SAU_KHI_DUYET_M01 = {
  bom: { flowers: [{ name: "Hồng đỏ", quantity: 20 }], foliage: [], accessories: [], wrapping: [] },
  confidence: 88,
  checklist: { hoa_chu_dao: "Hồng đỏ" },
  san_xuat: { so_tang_lop: 3 },
}

describe("hợp nhất dữ liệu bán hàng vào Product Master", () => {
  it("giữ nguyên định mức vật tư mà duyệt phân tích ảnh đã ghi", () => {
    const sau = mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)

    expect(sau.bom).toEqual(SAU_KHI_DUYET_M01.bom)
    expect(sau.confidence).toBe(88)
    expect(sau.checklist).toEqual(SAU_KHI_DUYET_M01.checklist)
    expect(sau.san_xuat).toEqual(SAU_KHI_DUYET_M01.san_xuat)
  })

  it("đặt phần bán hàng vào đúng khoá của nó", () => {
    const sau = mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)

    expect(sau[SALES_DATA_KEY]).toEqual({
      description: SALES.description,
      tags: SALES.tags,
      occasions: SALES.occasions,
      occasionCodes: SALES.occasionCodes,
      priceSegment: SALES.priceSegment,
    })
  })

  it("ghi mã dịp ở mức trên cùng, đúng chỗ bộ lọc tra cứu đọc", () => {
    const sau = mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)
    expect(sau.occasionCodes).toEqual(["anniversary"])
  })

  it("không đổi bản ghi gốc", () => {
    const truoc = JSON.parse(JSON.stringify(SAU_KHI_DUYET_M01))
    mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)
    expect(SAU_KHI_DUYET_M01).toEqual(truoc)
  })

  it("duyệt lại lần hai chỉ thay phần bán hàng", () => {
    const lan_mot = mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)
    const lan_hai = mergeSalesDataIntoAttributes(lan_mot, { ...SALES, priceSegment: "premium" })

    expect(lan_hai.bom).toEqual(SAU_KHI_DUYET_M01.bom)
    expect((lan_hai[SALES_DATA_KEY] as Record<string, unknown>).priceSegment).toBe("premium")
  })

  it("sản phẩm chưa có attributes vẫn dựng được", () => {
    expect(mergeSalesDataIntoAttributes(null, SALES)[SALES_DATA_KEY]).toBeDefined()
    expect(mergeSalesDataIntoAttributes(undefined, SALES)[SALES_DATA_KEY]).toBeDefined()
    expect(mergeSalesDataIntoAttributes("hỏng", SALES)[SALES_DATA_KEY]).toBeDefined()
  })

  it("liệt kê đúng khoá của bước trước để ghi nhật ký kiểm toán", () => {
    expect(preservedKeys(SAU_KHI_DUYET_M01).sort()).toEqual([
      "bom",
      "checklist",
      "confidence",
      "san_xuat",
    ])
    expect(preservedKeys(mergeSalesDataIntoAttributes(SAU_KHI_DUYET_M01, SALES)).sort()).toEqual([
      "bom",
      "checklist",
      "confidence",
      "occasionCodes",
      "san_xuat",
    ])
  })
})
