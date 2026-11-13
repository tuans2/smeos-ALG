import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TrackingSteps } from "@/components/greeting-card/customer/tracking-steps"

/**
 * Dải 5 bước trên điện thoại. Đợt 4 (D4-12): ép một dòng làm khung giờ đè sang cột bên ở 390px (ô ~60px),
 * nên khung giờ chỉ được ngắt NGAY SAU gạch nối (ký tự ngắt vô hình), không ngắt giữa giờ và không có dấu cách.
 */
describe("TrackingSteps — gọn trên một dòng", () => {
  const html = renderToStaticMarkup(
    createElement(TrackingSteps, {
      stepIndex: 1,
      createdAt: "2026-10-08T14:24:00.000Z",
      timeline: { arranging: { displayRange: "17:30 - 19:30" }, delivering: { displayRange: "20:00 - 22:00" } },
    })
  )

  it("khung giờ dùng gạch nối liền, không dấu cách; chỉ ngắt được sau gạch nối", () => {
    expect(html).toContain("17:30–\u200b19:30")
    expect(html).toContain("20:00–\u200b22:00")
    expect(html).not.toContain("17:30 - 19:30")
    expect(html).not.toContain("whitespace-nowrap")
  })

  it("nhãn bước ngắn gọn: 'Xác nhận' thay cho 'Đã xác nhận'", () => {
    expect(html).toContain(">Xác nhận<")
    expect(html).not.toContain("Đã xác nhận")
  })
})
