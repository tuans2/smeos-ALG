import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  PartnerProductCard,
  buildZaloText,
  type PartnerProductCardProps,
} from "@/components/templates/coordinator/partner-product-card"

// ĐP-1.1: "Giá bán khách" (unitPriceVnd) là dữ liệu thương mại của Sales, KHÔNG
// được lộ ra cho đối tác xưởng — dù qua bản chữ Zalo hay qua ảnh PNG xuất từ
// vùng `cardRef`. Ca thử này khoá lại hành vi đó để không tái diễn.

function buildProps(overrides: Partial<PartnerProductCardProps> = {}): PartnerProductCardProps {
  return {
    orderCode: "FLR-2026-0001",
    productTitle: "Bó Hồng Ohara Kem",
    sampleImageUrl: null,
    flowers: [
      { flowerName: "Hồng Ohara", quantity: 10, unit: "cành", color: "Kem", role: "Chủ đạo" },
    ],
    unitPriceVnd: 850000,
    partnerPayoutVnd: 400000,
    deliveryTargetTime: "16:00 26/09/2026",
    deliveryAddress: "123 Ba Đình, Phường 1, Quận 1, TP.HCM",
    recipientName: "Nguyễn Văn A",
    recipientPhone: "0900000000",
    ...overrides,
  }
}

describe("PartnerProductCard — ĐP-1.1: giá bán khách không lộ cho đối tác", () => {
  it("buildZaloText (bản chữ gửi đối tác) không chứa giá bán khách", () => {
    const props = buildProps()
    const text = buildZaloText(props)

    expect(text).not.toContain("850.000đ")
    expect(text).not.toContain("Giá bán khách")
    // Giá công đối tác vẫn phải có — đây là thông tin hợp lệ cho đối tác.
    expect(text).toContain("400.000đ")
  })

  it("vùng PNG (cardRef, data-testid t07-png-export-region) không chứa giá bán khách", () => {
    const props = buildProps()
    const html = renderToStaticMarkup(createElement(PartnerProductCard, props))

    const regionStart = html.indexOf('data-testid="t07-png-export-region"')
    const regionEnd = html.indexOf("Phiếu đặt hoa đối tác tự động")
    expect(regionStart).toBeGreaterThan(-1)
    expect(regionEnd).toBeGreaterThan(regionStart)
    const pngRegionHtml = html.slice(regionStart, regionEnd)

    expect(pngRegionHtml).not.toContain("850.000")
    expect(pngRegionHtml).not.toContain("Giá bán khách")

    // Nhưng toàn bộ markup (kể cả phần NGOÀI vùng PNG, chỉ hiển thị nội bộ)
    // vẫn phải còn giá bán khách — không phải bị xoá mất, chỉ là di chuyển
    // ra khỏi vùng chụp ảnh.
    expect(html).toContain("850.000")
    expect(html).toContain("chỉ nội bộ, không gửi đối tác")
  })

  it("không có giá bán khách (unitPriceVnd undefined) thì không hiện khối giá bán khách ở đâu cả", () => {
    const props = buildProps({ unitPriceVnd: undefined })
    const html = renderToStaticMarkup(createElement(PartnerProductCard, props))

    expect(html).not.toContain("Giá bán khách")
  })
})
