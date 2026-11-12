import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/components/greeting-card/flower-image", () => ({ FlowerImage: () => null }))
import { OrderPaymentProofView } from "@/components/greeting-card/order-payment-proof-view"

// Đợt 4 D4-14: tiệm tắt "AI đọc bill" (mặc định) thì không bao giờ có kết quả — không được hiện "đang đọc" mãi.
describe("OrderPaymentProofView — biên lai chưa có kết quả AI", () => {
  it("hiện hướng dẫn đối chiếu tay, không hiện trạng thái đang đọc", () => {
    const html = renderToStaticMarkup(<OrderPaymentProofView paymentProofUrl="https://example.com/bill.jpg" paymentProofAnalysis={null} />)
    expect(html).toContain("Chưa có kết quả đọc tự động")
    expect(html).not.toContain("Đang đọc dữ liệu biên lai")
    expect(html).not.toContain("animate-spin")
  })
})

describe("PaymentProofBadge — chưa có kết quả AI", () => {
  it("ghi 'Có ảnh bill', không xoay, không nói đang đọc", async () => {
    const { PaymentProofBadge } = await import("@/components/greeting-card/admin/payment-proof-badge")
    const html = renderToStaticMarkup(<PaymentProofBadge hasProofUrl analysis={null} />)
    expect(html).toContain("Có ảnh bill")
    expect(html).not.toContain("Đang đọc")
    expect(html).not.toContain("animate-spin")
  })
})
