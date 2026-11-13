import { describe, it, expect } from "vitest"
import { generateBannerCopyUseCase } from "./generate-banner-copy.use-case"
import { renderBannerSingleCallUseCase } from "./render-banner-single-call.use-case"
import type { BannerProjectInput } from "../domain/banner-types"

describe("generateBannerCopyUseCase", () => {
  it("tự động fallback về template khi không có external AI", async () => {
    const result = await generateBannerCopyUseCase({
      industryKey: "FASHION",
      occasionKey: "FLASH_SALE",
      occasionLabel: "Flash Sale Cuối Tuần",
      shopName: "Xinh Boutique",
      productTitle: "Váy Lụa Cao Cấp",
      shopPromotions: [],
    })

    expect(result.copy).toBeDefined()
    expect(result.copy.headline).toBeTruthy()
    expect(result.copy.promotionBadge).toBe("") // không tự hứa ưu đãi khi cửa hàng chưa nhập
    expect(result.copy.ctaText).toBeTruthy()
    expect(["AI_CONTENT_ENGINE", "INSTANT_TEMPLATE"]).toContain(result.source)
  })

  it("mẫu dự phòng in đúng ưu đãi tiệm đang bật, bỏ ưu đãi trình duyệt gửi lên", async () => {
    const result = await generateBannerCopyUseCase({
      industryKey: "FASHION",
      occasionKey: "BIRTHDAY",
      occasionLabel: "Sinh nhật",
      shopName: "Xinh Boutique",
      desiredPromotion: "GIẢM 50%",
      shopPromotions: ["Tặng thiệp"],
    })
    expect(result.copy.promotionBadge).toBe("TẶNG THIỆP")
  })
})

describe("renderBannerSingleCallUseCase", () => {
  const project: BannerProjectInput = {
    occasionKey: "FLASH_SALE",
    occasionLabel: "Flash Sale Cuối Tuần",
    industryKey: "FASHION",
    copy: {
      headline: "BÙNG NỔ ƯU ĐÃI",
      subHeadline: "Giảm giá đặc biệt toàn bộ sản phẩm",
      promotionBadge: "GIẢM 50%",
      ctaText: "MUA NGAY",
    },
    productImageUrl: "https://example.com/dress.jpg",
    brandInfo: {
      shopName: "Xinh Boutique",
      hotline: "0123456789",
      address: "Hà Nội",
    },
    stylePresetId: "VIBRANT_SALE",
    targetFormats: ["1:1", "9:16"],
  }

  it("thẩm định QC và trả kết quả render đầy đủ các định dạng", async () => {
    const output = await renderBannerSingleCallUseCase({ project })
    expect(output.qc.isPassed).toBe(true)
    expect(output.results).toHaveLength(2)
    expect(output.results[0]?.format).toBe("1:1")
    expect(output.results[1]?.format).toBe("9:16")
  })
})
