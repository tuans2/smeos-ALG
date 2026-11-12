import { describe, it, expect } from "vitest"
import {
  EXPORT_PRESETS,
  getExportPresetsForMediaType,
  buildExportFileName,
  validateMediaExport,
} from "../media-export-presets"

describe("media-export-presets — HA-05..10, VD-05..07", () => {
  it("chứa đầy đủ các preset chuẩn mạng xã hội phổ biến", () => {
    const ids = EXPORT_PRESETS.map((p) => p.id)
    expect(ids).toContain("TIKTOK_VERTICAL")
    expect(ids).toContain("INSTAGRAM_STORY")
    expect(ids).toContain("FEED_SQUARE")
    expect(ids).toContain("FEED_PORTRAIT")
    expect(ids).toContain("YOUTUBE_LANDSCAPE")
    expect(ids).toContain("ZALO_PRODUCT")
  })

  describe("getExportPresetsForMediaType", () => {
    it("lọc ra các preset phù hợp cho VIDEO", () => {
      const presets = getExportPresetsForMediaType("VIDEO")
      expect(presets.some((p) => p.id === "TIKTOK_VERTICAL")).toBe(true)
      expect(presets.some((p) => p.id === "YOUTUBE_LANDSCAPE")).toBe(true)
    })

    it("lọc ra các preset phù hợp cho IMAGE", () => {
      const presets = getExportPresetsForMediaType("IMAGE")
      expect(presets.some((p) => p.id === "FEED_SQUARE")).toBe(true)
      expect(presets.some((p) => p.id === "FEED_PORTRAIT")).toBe(true)
      expect(presets.some((p) => p.id === "ZALO_PRODUCT")).toBe(true)
    })
  })

  describe("buildExportFileName", () => {
    it("chuẩn hoá tên tiếng Việt thành slug sạch kèm platform và ratio", () => {
      const fileName = buildExportFileName({
        productTitle: "Bó Hoa Hồng Đỏ Khai Trương",
        platform: "tiktok",
        ratio: "9:16",
        format: "mp4",
      })
      expect(fileName).toBe("bo-hoa-hong-do-khai-truong_tiktok_9-16.mp4")
    })

    it("xử lý fallback khi productTitle rỗng hoặc chứa ký tự đặc biệt", () => {
      const fileName = buildExportFileName({
        productTitle: "!!! @#$ %^&",
        platform: "facebook_feed",
        ratio: "1:1",
        format: "png",
      })
      expect(fileName).toBe("alg-asset_facebook-feed_1-1.png")
    })
  })

  describe("validateMediaExport", () => {
    it("báo lỗi nếu presetId không hợp lệ", () => {
      const res = validateMediaExport({
        targetPresetId: "INVALID_PRESET",
        mediaType: "IMAGE",
      })
      expect(res.isValid).toBe(false)
      expect(res.warning).toBeDefined()
    })

    it("cảnh báo thời lượng video vượt khuyến nghị TikTok", () => {
      const res = validateMediaExport({
        targetPresetId: "TIKTOK_VERTICAL",
        mediaType: "VIDEO",
        durationSeconds: 90, // Max recommended is 60s
      })
      expect(res.isValid).toBe(true)
      expect(res.warning).toContain("vượt khuyến nghị")
    })

    it("hợp lệ khi video đúng thời lượng khuyến nghị", () => {
      const res = validateMediaExport({
        targetPresetId: "TIKTOK_VERTICAL",
        mediaType: "VIDEO",
        durationSeconds: 30,
      })
      expect(res.isValid).toBe(true)
      expect(res.warning).toBeUndefined()
    })
  })
})
