import { describe, it, expect, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PartnerCard } from "../partner-card"
import type { PartnerView } from "@/modules/coordinator/use-cases/manage-partners"

describe("PartnerCard (DT-01..06)", () => {
  const activePartner: PartnerView = {
    id: "p-01",
    code: "XUONG-Q1-01",
    name: "Tiệm Hoa Lan Nhi",
    phone: "0909123456",
    address: "123 Lê Lợi",
    district: "Quận 1",
    province: "TP. Hồ Chí Minh",
    tier: "VIP",
    rating: 4.9,
    capacityDaily: 25,
    isActive: true,
    customFields: {},
  }

  const pausedPartner: PartnerView = {
    id: "p-02",
    code: "XUONG-BT-02",
    name: "Tiệm Hoa Cúc Vàng",
    phone: "0908765432",
    address: null,
    district: "Bình Thạnh",
    province: "TP. Hồ Chí Minh",
    tier: "STANDARD",
    rating: 4.2,
    capacityDaily: 10,
    isActive: false,
    customFields: {},
  }

  it("render đúng thông tin đối tác VIP đang hoạt động", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerCard, {
        partner: activePartner,
        onToggleStatus: vi.fn(),
      })
    )

    expect(html).toContain("XUONG-Q1-01")
    expect(html).toContain("Tiệm Hoa Lan Nhi")
    expect(html).toContain("0909123456")
    expect(html).toContain("Quận 1, TP. Hồ Chí Minh")
    expect(html).toContain("VIP Đặc biệt")
    expect(html).toContain("4.9")
    expect(html).toContain("25")
    expect(html).toContain("Tạm ngưng")
  })

  it("render đúng nhãn Tạm ngưng và nút Kích hoạt cho đối tác ngừng hoạt động", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerCard, {
        partner: pausedPartner,
        onToggleStatus: vi.fn(),
      })
    )

    expect(html).toContain("XUONG-BT-02")
    expect(html).toContain("Tiệm Hoa Cúc Vàng")
    expect(html).toContain("Tiêu chuẩn")
    expect(html).toContain("Tạm ngưng")
    expect(html).toContain("Kích hoạt")
  })
})
