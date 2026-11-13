import { describe, it, expect } from "vitest"
import {
  scaleBOMForSize,
  calculateAllSizes,
  SIZE_VARIANT_CONFIGS,
  type AtomicStemItem,
} from "../product-size-variants"

describe("Product Size Variants & Dynamic BOM Domain (SP-12, SP-13, SP-14)", () => {
  const baseStems: AtomicStemItem[] = [
    {
      id: "stem-1",
      name: "Hồng đỏ Ohara",
      quantity: 10,
      unit: "cành",
      unitCostVnd: 15_000,
      color: "Đỏ",
      isMainFlower: true,
    },
    {
      id: "stem-2",
      name: "Baby trắng",
      quantity: 5,
      unit: "nhánh",
      unitCostVnd: 8_000,
      color: "Trắng",
      isMainFlower: false,
    },
    {
      id: "stem-3",
      name: "Giấy gói Hàn Quốc",
      quantity: 1,
      unit: "cuộn",
      unitCostVnd: 20_000,
      isMainFlower: false,
    },
  ]

  it("giữ nguyên 100% công thức cành khi chọn Size M (chuẩn thiết kế)", () => {
    const resM = scaleBOMForSize(baseStems, "SIZE_M")

    expect(resM.sizeKey).toBe("SIZE_M")
    expect(resM.config.scaleMultiplier).toBe(1.0)
    expect(resM.mainStemsCount).toBe(10)
    expect(resM.totalStemsCount).toBe(15) // 10 hồng + 5 baby
    // Chi phí vốn: 10*15k + 5*8k + 1*20k = 150k + 40k + 20k = 210k
    expect(resM.totalCostVnd).toBe(210_000)
    // Giá bán: 210k * 2.4 = 504k -> làm tròn 500k
    expect(resM.suggestedSellingPriceVnd).toBe(500_000)
  })

  it("thu nhỏ tỷ lệ 0.7x cho Size S nhưng không giảm phụ liệu giấy gói", () => {
    const resS = scaleBOMForSize(baseStems, "SIZE_S")

    expect(resS.sizeKey).toBe("SIZE_S")
    expect(resS.config.scaleMultiplier).toBe(0.7)
    // 10 hồng * 0.7 = 7 cành
    expect(resS.mainStemsCount).toBe(7)
    // 5 baby * 0.7 = 3.5 -> làm tròn 4 nhánh
    const baby = resS.stems.find((s) => s.name === "Baby trắng")
    expect(baby?.quantity).toBe(4)
    // Giấy gói giữ nguyên 1 cuộn
    const wrap = resS.stems.find((s) => s.unit === "cuộn")
    expect(wrap?.quantity).toBe(1)
  })

  it("mở rộng tỷ lệ 1.4x cho Size L và 1.8x cho Size XL", () => {
    const resL = scaleBOMForSize(baseStems, "SIZE_L")
    expect(resL.mainStemsCount).toBe(14) // 10 * 1.4 = 14

    const resXL = scaleBOMForSize(baseStems, "SIZE_XL")
    expect(resXL.mainStemsCount).toBe(18) // 10 * 1.8 = 18
  })

  it("calculateAllSizes tính toán đồng thời 4 phiên bản kích thước chính xác", () => {
    const all = calculateAllSizes(baseStems)

    expect(all.SIZE_S.mainStemsCount).toBe(7)
    expect(all.SIZE_M.mainStemsCount).toBe(10)
    expect(all.SIZE_L.mainStemsCount).toBe(14)
    expect(all.SIZE_XL.mainStemsCount).toBe(18)

    // Giá bán tăng dần theo size
    expect(all.SIZE_S.suggestedSellingPriceVnd).toBeLessThan(all.SIZE_M.suggestedSellingPriceVnd)
    expect(all.SIZE_M.suggestedSellingPriceVnd).toBeLessThan(all.SIZE_L.suggestedSellingPriceVnd)
    expect(all.SIZE_L.suggestedSellingPriceVnd).toBeLessThan(all.SIZE_XL.suggestedSellingPriceVnd)
  })
})
