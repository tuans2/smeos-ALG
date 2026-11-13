import { describe, it, expect } from "vitest"
import { evaluateBannerQc } from "./banner-rules"
import { generateInstantBannerCopy, getInstantBannerTemplate } from "./banner-template-generator"
import type { BannerProjectInput } from "./banner-types"

describe("evaluateBannerQc", () => {
  const validProject: BannerProjectInput = {
    occasionKey: "FLASH_SALE",
    occasionLabel: "Flash Sale Cuối Tuần",
    industryKey: "FASHION",
    copy: {
      headline: "BÙNG NỔ ƯU ĐÃI THÁNG 10",
      subHeadline: "Bộ sưu tập mới nhất giảm giá đặc biệt trong tuần này",
      promotionBadge: "GIẢM 30%",
      ctaText: "MUA NGAY",
      validityText: "Chỉ từ 20/10 - 25/10",
    },
    productImageUrl: "https://example.com/product.jpg",
    brandInfo: {
      shopName: "Tiệm Thời Trang Xinh",
      hotline: "0123456789",
      address: "123 Phố Huế, Hà Nội",
    },
    stylePresetId: "VIBRANT_SALE",
    targetFormats: ["1:1", "4:5", "9:16", "16:9", "A4"],
  }

  it("chấp thuận dự án poster/banner khi đủ mọi tiêu chí bắt buộc", () => {
    const evaluation = evaluateBannerQc(validProject)
    expect(evaluation.isPassed).toBe(true)
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(0.8)
    expect(evaluation.failedCriteria).toHaveLength(0)
  })

  it("bắt lỗi khi thiếu ảnh sản phẩm thật (product_fidelity)", () => {
    const invalid = { ...validProject, productImageUrl: "" }
    const evaluation = evaluateBannerQc(invalid)
    expect(evaluation.isPassed).toBe(false)
    expect(evaluation.failedCriteria).toContain("product_fidelity")
    expect(evaluation.retryHint).toContain("ảnh sản phẩm thật")
  })

  it("bắt lỗi khi thiếu tên cửa hàng hoặc thông tin liên hệ (brand_identity)", () => {
    const invalid = {
      ...validProject,
      brandInfo: { shopName: "", hotline: "", address: "" },
    }
    const evaluation = evaluateBannerQc(invalid)
    expect(evaluation.isPassed).toBe(false)
    expect(evaluation.failedCriteria).toContain("brand_identity")
  })

  it("bắt lỗi khi thiếu lời kêu gọi hành động (cta_presence)", () => {
    const invalid = {
      ...validProject,
      copy: { ...validProject.copy, ctaText: "" },
    }
    const evaluation = evaluateBannerQc(invalid)
    expect(evaluation.isPassed).toBe(false)
    expect(evaluation.failedCriteria).toContain("cta_presence")
  })
})

describe("banner-template-generator", () => {
  it("sinh copy tức thì chuẩn theo dịp FLASH_SALE", () => {
    const copy = generateInstantBannerCopy({ occasionKey: "FLASH_SALE" })
    expect(copy.headline).toContain("FLASH SALE")
    expect(copy.ctaText).toBeTruthy()
  })

  it("không tự in ưu đãi/thời hạn lên ấn phẩm khi cửa hàng chưa nhập", () => {
    expect(generateInstantBannerCopy({ occasionKey: "FLASH_SALE" })).toMatchObject({ promotionBadge: "", validityText: "" })
    expect(generateInstantBannerCopy({ occasionKey: "FLASH_SALE", suggestedPromotion: "Giảm 15%" }).promotionBadge).toBe("Giảm 15%")
  })

  it("gợi ý preset VIBRANT_SALE cho dịp FLASH_SALE", () => {
    const tpl = getInstantBannerTemplate("FLASH_SALE")
    expect(tpl.recommendedPreset).toBe("VIBRANT_SALE")
  })

  it("gợi ý preset ELEGANT_LUXURY cho dịp 20_10", () => {
    const tpl = getInstantBannerTemplate("20_10_PHU_NU")
    expect(tpl.recommendedPreset).toBe("ELEGANT_LUXURY")
  })
})
