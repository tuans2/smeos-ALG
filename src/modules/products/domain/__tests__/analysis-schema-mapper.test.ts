import { describe, it, expect } from "vitest"
import { mapAnalysisFromSchema, VISION_SCHEMA } from "../analysis-schema-mapper"
import type { ResultFieldItem } from "@/components/result/result-card"

describe("analysis-schema-mapper (Khóa hợp đồng Schema.json ra UI)", () => {
  it("khẳng định Schema.json có đủ 6 khối cấp một bắt buộc", () => {
    const required = VISION_SCHEMA.schema.required
    expect(required).toContain("palette_accounting")
    expect(required).toContain("checklist")
    expect(required).toContain("identity")
    expect(required).toContain("bom")
    expect(required).toContain("confidence")
    expect(required).toContain("san_xuat")
  })

  it("khi raw rỗng hoặc null, 100% trường vẫn hiển thị và nhận giá trị N/A", () => {
    const fields = mapAnalysisFromSchema(null)

    // Đảm bảo đủ các trường chính
    const keys = fields.map((f) => f.key)
    expect(keys).toContain("flowers")
    expect(keys).toContain("foliage")
    expect(keys).toContain("accessories")
    expect(keys).toContain("wrapping")
    expect(keys).toContain("palette_accounting")
    expect(keys).toContain("category")
    expect(keys).toContain("shape")
    expect(keys).toContain("facing")
    expect(keys).toContain("container")
    expect(keys).toContain("phong_cach")
    expect(keys).toContain("dip_su_dung")
    expect(keys).toContain("so_tang_lop")
    expect(keys).toContain("materials_note")
    expect(keys).toContain("checklist")
    expect(keys).toContain("totals")
    expect(keys).toContain("totals-bud")
    expect(keys).toContain("totals-damaged")
    expect(keys).toContain("confidence")

    // Các trường text/readonly phải là N/A
    const textFields = ["category", "shape", "facing", "container", "phong_cach", "dip_su_dung", "materials_note", "totals", "totals-bud", "totals-damaged", "confidence"]
    for (const key of textFields) {
      const field = fields.find((f) => f.key === key)
      expect(field?.value).toBe("N/A")
    }

    // Các trường list rỗng
    const listFields = ["flowers", "foliage", "accessories", "wrapping", "palette_accounting"]
    for (const key of listFields) {
      const field = fields.find((f) => f.key === key)
      expect(Array.isArray(field?.value)).toBe(true)
      expect((field?.value as unknown[]).length).toBe(0)
    }

    // Checklist phải hiển thị đủ 10 tiêu chuẩn, trạng thái N/A
    const checklistField = fields.find((f) => f.key === "checklist")
    expect(Array.isArray(checklistField?.value)).toBe(true)
    const items = checklistField?.value as Array<{ id: string; value: string }>
    expect(items.length).toBe(10)
    for (const item of items) {
      expect(item.value).toContain("N/A")
    }
  })

  it("khi raw có dữ liệu, ánh xạ đúng từng trường và tách biệt name, unit, quantity", () => {
    const raw = {
      identity: {
        category: "Sản phẩm",
        shape: "Tròn",
        facing: "Toàn diện 360",
        container: "Giấy gói",
        phong_cach: "Hiện đại",
        dip_su_dung: "Sinh nhật",
      },
      san_xuat: {
        so_tang_lop: 3,
      },
      bom: {
        flowers: [
          {
            name: "Hoa tuylip",
            nhom_hoa: "Tuylip",
            dvt_dem: "Bông",
            quantity: 10,
            role: "Hoa chủ đạo",
            mau: "TM08 Vàng",
            mo_ta_mau: "Vàng cam tươi",
            so_nu: 2,
            so_hong: 0,
          },
        ],
        foliage: [
          {
            name: "Lá bạc",
            dvt_dem: "Cành",
            quantity: 5,
            role: "Nền",
            mau: "TM05 Xanh lá",
          },
        ],
        accessories: [
          {
            name: "Nơ ruy băng",
            material: "Lụa",
            quantity: 1,
            color: "Vàng kem",
          },
        ],
        wrapping: [
          {
            layer: "Lớp ngoài",
            material: "Giấy mờ Hàn Quốc",
            color: "Trắng sữa",
            texture: "Mờ",
          },
        ],
        materials_note: "Dùng thêm que đỡ cành",
      },
      palette_accounting: [
        { cluster_index: 0, thuoc_ve: "Tuylip vàng", nhom: "Hoa", confidence: 95 },
      ],
      checklist: {
        hoa_chu_dao: "Có",
        hoa_phu: "Không có",
        hoa_lap_day: "Không có",
        la_nen: "Có",
        la_diem_nhan: "Không có",
        vat_lieu_goi: "Có",
        day_buoc: "Có",
        ruy_bang: "Có",
        thiep_bien_chu: "Không có",
        phu_kien_trang_tri: "Không có",
      },
      confidence: 94,
    }

    const fields = mapAnalysisFromSchema(raw)

    const cat = fields.find((f) => f.key === "category")
    expect(cat?.value).toBe("Sản phẩm")

    const flow = fields.find((f) => f.key === "flowers")
    const flowerItems = flow?.value as ResultFieldItem[]
    expect(flowerItems.length).toBe(1)
    expect(flowerItems[0]?.name).toBe("Hoa tuylip")
    expect(flowerItems[0]?.unit).toBe("Bông")
    expect(flowerItems[0]?.quantity).toBe(10)
    expect(flowerItems[0]?.role).toBe("Hoa chủ đạo")

    const fol = fields.find((f) => f.key === "foliage")
    const folItems = fol?.value as ResultFieldItem[]
    expect(folItems[0]?.name).toBe("Lá bạc")
    expect(folItems[0]?.unit).toBe("Cành")
    expect(folItems[0]?.quantity).toBe(5)

    const totals = fields.find((f) => f.key === "totals")
    expect(totals?.value).toBe("10 cành")

    const bud = fields.find((f) => f.key === "totals-bud")
    expect(bud?.value).toBe("2 nụ")
  })

  it("ánh xạ chính xác phụ kiện thiệp có printed_text và trường card_printed_text", () => {
    const raw = {
      bom: {
        flowers: [{ name: "Hoa hồng", quantity: 10 }],
        foliage: [{ name: "Lá bạc", quantity: 3 }],
        accessories: [
          { name: "Thiệp chúc mừng", printed_text: "Mừng sinh nhật mẹ", quantity: 1 },
          { name: "Nơ ruy băng", quantity: 1 },
        ],
      },
    }

    const fields = mapAnalysisFromSchema(raw)

    const cardField = fields.find((f) => f.key === "card_printed_text")
    expect(cardField?.value).toBe("Mừng sinh nhật mẹ")

    const acc = fields.find((f) => f.key === "accessories")
    const accItems = acc?.value as ResultFieldItem[]
    expect(accItems.length).toBe(2)
    expect(accItems[0]?.value).toContain("💌")
    expect(accItems[0]?.value).toContain('In: "Mừng sinh nhật mẹ"')
    expect(accItems[1]?.value).toContain("🎀")
  })

  it("khi industryKey là HOMESTAY, các nhãn hiển thị được override chuẩn xác theo ngành lưu trú", () => {
    const fields = mapAnalysisFromSchema(null, "HOMESTAY")

    const flowersField = fields.find((f) => f.key === "flowers")
    expect(flowersField?.label).toBe("Tiện nghi phòng nhìn thấy")

    const categoryField = fields.find((f) => f.key === "category")
    expect(categoryField?.label).toBe("Hạng phòng / Loại hình lưu trú")

    const checklistField = fields.find((f) => f.key === "checklist")
    expect(checklistField?.label).toBe("Checklist 8 tiêu chuẩn kiểm phòng")

    const paletteField = fields.find((f) => f.key === "palette_accounting")
    expect(paletteField?.label).toBe("Bảng màu không gian phòng")

    const cardField = fields.find((f) => f.key === "card_printed_text")
    expect(cardField?.label).toBe("Bảng biển / Nội quy / Thẻ phòng (OCR)")
  })
})

