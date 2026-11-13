import { describe, it, expect } from "vitest"
import {
  generateHeadline,
  generateFlowerContent,
  TONE_LABELS,
  type FlowerContentInput,
} from "../flower-content-presets"

describe("Flower Content Presets Domain (ND-01 -> ND-10)", () => {
  it("định nghĩa đầy đủ 5 tone giọng chuẩn", () => {
    expect(Object.keys(TONE_LABELS)).toHaveLength(5)
    expect(TONE_LABELS.SANG_TRONG.label).toContain("Sang trọng")
    expect(TONE_LABELS.AM_AP.label).toContain("Ấm áp")
    expect(TONE_LABELS.TRE_TRUNG.label).toContain("Trẻ trung")
    expect(TONE_LABELS.TRANG_NGHIEM.label).toContain("Trang nghiêm")
    expect(TONE_LABELS.THUYET_PHUC.label).toContain("Thuyết phục")
  })

  it("sinh tiêu đề phù hợp theo từng tone giọng", () => {
    const base: FlowerContentInput = {
      productName: "Bó Hoa Tinh Khôi",
      occasion: "Sinh nhật bạn gái",
      format: "FB_POST",
      tone: "SANG_TRONG",
    }

    const h1 = generateHeadline(base)
    expect(h1).toContain("Tuyệt Tác Bó Hoa Tinh Khôi")

    const h2 = generateHeadline({ ...base, tone: "TRE_TRUNG" })
    expect(h2).toContain("Đẹp \"Xỉu Ngang\"")

    const h3 = generateHeadline({ ...base, tone: "AM_AP" })
    expect(h3).toContain("Gửi Trọn Yêu Thương")
  })

  it("sinh bài viết Facebook đầy đủ tiêu đề, thân bài, CTA và hashtag", () => {
    const res = generateFlowerContent({
      productName: "Bó Hoa Hồng Juliet",
      flowerTypes: ["Hoa hồng Juliet", "Baby trắng", "Lá bạc"],
      colorTheme: "Cam pastel",
      occasion: "Kỷ niệm ngày cưới",
      format: "FB_POST",
      tone: "AM_AP",
      shopBrandName: "Mộc Lan Florist",
      priceVnd: 850_000,
    })

    expect(res.recommendedPlatform).toBe("Facebook")
    expect(res.headline).toBeDefined()
    expect(res.bodyText).toContain("Bó Hoa Hồng Juliet")
    expect(res.bodyText).toContain("Cam pastel")
    expect(res.callToAction).toContain("Nhắn tin")
    expect(res.hashtags.some((h) => h.includes("bo_hoa_hong_juliet"))).toBe(true)
    expect(res.characterCount).toBeGreaterThan(100)
  })

  it("sinh kịch bản video TikTok 30 giây với đầy đủ 3 phân cảnh (ND-10)", () => {
    const res = generateFlowerContent({
      productName: "Hộp Hoa Hướng Dương",
      flowerTypes: ["Hướng dương Đà Lạt", "Cúc tana"],
      colorTheme: "Vàng rực rỡ",
      occasion: "Chúc mừng thăng chức",
      format: "VIDEO_SCRIPT",
      tone: "TRE_TRUNG",
      shopBrandName: "Tiệm Hoa Xinh",
    })

    expect(res.recommendedPlatform).toBe("TikTok / Reels")
    expect(res.videoScenes).toBeDefined()
    expect(res.videoScenes).toHaveLength(3)
    expect(res.videoScenes?.[0]?.timeRange).toContain("0s - 3s (Hook)")
    expect(res.videoScenes?.[1]?.visualDesc).toContain("Nghệ nhân")
    expect(res.videoScenes?.[2]?.voiceover).toContain("Giao hàng hoả tốc")
  })

  it("sinh caption Instagram súc tích, tinh tế (ND-02)", () => {
    const res = generateFlowerContent({
      productName: "Bình Hoa Tulip Trắng",
      format: "INSTA_CAPTION",
      tone: "SANG_TRONG",
    })

    expect(res.recommendedPlatform).toBe("Instagram")
    expect(res.callToAction).toContain("Direct")
    expect(res.characterCount).toBeLessThan(400)
  })
})
