import { describe, expect, it } from "vitest"
import {
  CTA_CODES,
  CTA_REGISTRY,
  getCtaDefinition,
  isCtaCode,
  listAllCtas,
} from "./cta-registry"
import {
  ALLOWED_CTAS_BY_DESTINATION,
  getAvailableCtasForDestination,
  getChannelDefinition,
  isCtaAllowedForDestination,
  isDestinationAllowedForAsset,
  USAGE_CHANNELS,
} from "./usage-rules"

describe("CTA Registry (PO 01/11/2026 PR-2)", () => {
  it("định nghĩa đủ 8 mã CTA chuẩn với nhãn tiếng Việt tự nhiên", () => {
    expect(CTA_CODES).toHaveLength(8)
    const list = listAllCtas()
    expect(list).toHaveLength(8)

    for (const cta of list) {
      expect(cta.label).toBeTruthy()
      expect(cta.description).toBeTruthy()
      expect(cta.defaultButtonText).toBeTruthy()
      // Không chứa jargon kỹ thuật
      expect(cta.label).not.toMatch(/api|db|id|endpoint/i)
    }
  })

  it("getCtaDefinition tìm chính xác hoặc undefined", () => {
    expect(getCtaDefinition("ORDER")?.label).toBe("Đặt hàng ngay")
    expect(getCtaDefinition("REQUEST_QUOTE")?.label).toBe("Yêu cầu báo giá")
    expect(getCtaDefinition("INVALID")).toBeUndefined()
  })

  it("isCtaCode xác thực type guard chính xác", () => {
    expect(isCtaCode("PAY")).toBe(true)
    expect(isCtaCode("REFUND")).toBe(false)
  })
})

describe("Usage Rules & Destination Matrix (PO 01/11/2026 PR-2)", () => {
  it("Quảng bá (PROMOTION) không cho phép ORDER hoặc PAY trực tiếp", () => {
    expect(isCtaAllowedForDestination("ORDER", "PROMOTION")).toBe(false)
    expect(isCtaAllowedForDestination("PAY", "PROMOTION")).toBe(false)
    expect(isCtaAllowedForDestination("LEARN_MORE", "PROMOTION")).toBe(true)
    expect(isCtaAllowedForDestination("CONTACT", "PROMOTION")).toBe(true)
  })

  it("Bán hàng (SALES) cho phép ORDER, PAY và REQUEST_QUOTE", () => {
    expect(isCtaAllowedForDestination("ORDER", "SALES")).toBe(true)
    expect(isCtaAllowedForDestination("PAY", "SALES")).toBe(true)
    expect(isCtaAllowedForDestination("REQUEST_QUOTE", "SALES")).toBe(true)
  })

  it("Chăm sóc (CARE) hỗ trợ REVIEW, CONTACT, REFER", () => {
    const careCtas = getAvailableCtasForDestination("CARE")
    expect(careCtas).toContain("REVIEW")
    expect(careCtas).toContain("CONTACT")
    expect(careCtas).toContain("REFER")
    expect(careCtas).not.toContain("PAY")
  })

  it("kiểm tra nơi dùng hợp lệ theo loại asset", () => {
    // Asset #8 (Poster quảng cáo) dùng cho PROMOTION và SALES
    expect(isDestinationAllowedForAsset("8", "PROMOTION")).toBe(true)
    // Asset #18 (Catalog sản phẩm) dùng cho PROMOTION và SALES
    expect(isDestinationAllowedForAsset("18", "SALES")).toBe(true)
    // Asset mã lạ không tồn tại
    expect(isDestinationAllowedForAsset("9999", "PROMOTION")).toBe(false)
  })

  it("bảng kênh phân phối minh bạch trạng thái tự động / thủ công / chưa hỗ trợ", () => {
    const webLink = getChannelDefinition("WEB_LINK")
    expect(webLink?.automationLevel).toBe("AUTOMATED")

    const zalo = getChannelDefinition("ZALO_OA")
    expect(zalo?.automationLevel).toBe("MANUAL")
    expect(zalo?.instructions).toContain("thủ công")

    const sms = getChannelDefinition("SMS")
    expect(sms?.automationLevel).toBe("MANUAL")

    const tiktok = getChannelDefinition("TIKTOK_DIRECT")
    expect(tiktok?.automationLevel).toBe("UNSUPPORTED")
  })
})
