import { describe, it, expect } from "vitest"
import { saleCancellationReminder, vnDeadlineLabel } from "../customer-cancellation-notice"

/** Tin nhắc Sale khi Điều phối huỷ đơn (PO 16/10/2026): hạn = lúc duyệt + 2 tiếng, giờ Việt Nam. */
describe("saleCancellationReminder", () => {
  const decidedAt = new Date("2026-10-16T07:30:00.000Z") // 14:30 giờ VN

  it("có tiền hoàn: nêu số tiền và hạn", () => {
    expect(saleCancellationReminder({ orderCode: "DH1", decidedAt, refundVnd: 450_000, customerReportedPayment: false }))
      .toBe("Đơn #DH1 đã bị Điều phối huỷ (đã được duyệt). Vui lòng gọi/nhắn khách thông báo và xử lý hoàn 450.000đ trước 16:30 ngày 16/10 (tối đa 2 tiếng).")
  })

  it("không hoàn tiền: chỉ nhắc liên hệ; khách báo đã chuyển mà chưa ghi nhận: nhắc kiểm tiền để hoàn", () => {
    expect(saleCancellationReminder({ orderCode: "DH2", decidedAt, refundVnd: 0, customerReportedPayment: false })).not.toMatch(/hoàn/)
    expect(saleCancellationReminder({ orderCode: "DH3", decidedAt, refundVnd: 0, customerReportedPayment: true })).toMatch(/kiểm tra khoản khách đã chuyển và xử lý hoàn tiền/)
  })

  it("giờ hẹn theo giờ Việt Nam, qua nửa đêm sang ngày sau", () => {
    expect(vnDeadlineLabel("2026-10-16T17:05:00.000Z")).toBe("00:05 ngày 17/10")
  })
})
