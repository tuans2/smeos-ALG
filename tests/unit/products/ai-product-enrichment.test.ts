import { describe, expect, it } from "vitest"
import {
  applyVisionToForm,
  buildProductPatchPayload,
  type ProductFormValues,
  type VisionExtractResult,
} from "@/components/products/ai-product-helpers"

describe("AI Product Enrichment Helpers", () => {
  const baseForm: ProductFormValues = {
    name: "",
    code: "BST-001",
    category: "Bó hoa",
    shape: "Tròn",
    facing: "Một mặt",
    container: "",
    priceVnd: "",
    primaryColor: "",
    description: "",
    status: "ACTIVE",
    flowers: [{ id: "1", name: "", quantity: 1, unit: "cành", color: "", role: "Chủ đạo" }],
  }

  const sampleVision: VisionExtractResult = {
    productName: "Bó hồng Juliet kiêu sa",
    components: [
      { flowerType: "Hồng Juliet", quantityEstimate: 10, unit: "cành", role: "dominant", color: "Cam pastel" },
      { flowerType: "Cát tường trắng", quantityEstimate: 5, unit: "cành", role: "supporting", color: "Trắng" },
    ],
    attributes: {
      shape: "Tròn",
      style: "Phong cách Hàn Quốc lãng mạn",
      mainColors: ["Cam pastel", "Trắng"],
      secondaryColors: ["Xanh lá"],
    },
    packaging: {
      wrappingMaterial: "Giấy xi măng vintage",
      wrappingColor: "Nâu mộc",
      ribbon: "Ruy băng voan",
    },
    context: {
      likelyOccasions: ["Sinh nhật", "Kỷ niệm"],
      suggestedPrice: 750000,
    },
  }

  it("applyVisionToForm: tự động điền các trường còn thiếu từ kết quả Vision", () => {
    const { updated, filledFieldsCount } = applyVisionToForm(sampleVision, baseForm)

    expect(filledFieldsCount).toBeGreaterThan(0)
    expect(updated.name).toBe("Bó hồng Juliet kiêu sa")
    expect(updated.container).toBe("Giấy xi măng vintage, Nâu mộc, Ruy băng voan")
    expect(updated.primaryColor).toBe("Cam pastel, Trắng")
    expect(updated.priceVnd).toBe("750.000")
    expect(updated.flowers.length).toBe(2)
    expect(updated.flowers[0]?.name).toBe("Hồng Juliet")
    expect(updated.flowers[0]?.quantity).toBe(10)
    expect(updated.flowers[1]?.name).toBe("Cát tường trắng")
  })

  it("applyVisionToForm: không ghi đè tên nếu người dùng đã có tên sẵn", () => {
    const customForm: ProductFormValues = {
      ...baseForm,
      name: "Tên tôi đã đặt",
    }
    const { updated } = applyVisionToForm(sampleVision, customForm)
    expect(updated.name).toBe("Tên tôi đã đặt")
  })

  it("buildProductPatchPayload: tạo payload chuẩn xác để cập nhật vào API", () => {
    const formWithData: ProductFormValues = {
      ...baseForm,
      name: "Bó hoa Tình Nồng",
      priceVnd: "650.000",
      primaryColor: "Đỏ",
      description: "Mẫu hoa tươi thắm nồng nàn tình cảm.",
      flowers: [
        { id: "1", name: "Hoa hồng đỏ", quantity: 12, unit: "cành", color: "Đỏ", role: "Chủ đạo" },
      ],
    }

    const payload = buildProductPatchPayload(formWithData, {}, "asset-123", "/img/1.jpg")

    expect(payload.name).toBe("Bó hoa Tình Nồng")
    expect(payload.image_asset_id).toBe("asset-123")
    expect(payload.attributes.price).toBe(650000)
    expect(payload.attributes.color).toBe("Đỏ")
    expect(payload.attributes.description).toBe("Mẫu hoa tươi thắm nồng nàn tình cảm.")
    expect(payload.attributes.bom.flowers.length).toBe(1)
    expect(payload.attributes.bom.flowers[0]?.name).toBe("Hoa hồng đỏ")
  })
})
