import { describe, expect, it } from "vitest"
import {
  STAFF_NOTIFY_MATRIX,
  formatStaffNotificationText,
  resolveStaffNotificationTargets,
} from "../staff-notification-matrix"
import { STAFF_NOTIFY_EVENTS, type StaffNotifyChannel } from "../staff-notification-types"

describe("Staff Notification Matrix SSOT", () => {
  it("định nghĩa đầy đủ cấu hình cho tất cả 10 sự kiện chuẩn", () => {
    for (const event of STAFF_NOTIFY_EVENTS) {
      const targets = STAFF_NOTIFY_MATRIX[event]
      expect(targets).toBeDefined()
      expect(targets.length).toBeGreaterThan(0)
    }
  })

  it("luôn bao gồm kênh APP_INBOX trong mọi cấu hình sự kiện", () => {
    for (const event of STAFF_NOTIFY_EVENTS) {
      for (const target of STAFF_NOTIFY_MATRIX[event]) {
        expect(target.channels).toContain("APP_INBOX")
      }
    }
  })

  it("định dạng văn bản thông báo đầy đủ thông tin đơn hàng và khách hàng", () => {
    const formatted = formatStaffNotificationText("ORDER_RECEIVED", {
      orderCode: "DH123456",
      customerName: "Nguyễn Văn A",
      productName: "Bó hoa hồng đỏ",
      amountVnd: 500000,
    })

    expect(formatted.title).toContain("[Đơn DH123456]")
    expect(formatted.title).toContain("Có đơn hàng mới")
    expect(formatted.message).toContain("Nguyễn Văn A")
    expect(formatted.message).toContain("500.000 đ")
  })

  it("định dạng cảnh báo khẩn cấp cho sự kiện khách xin huỷ đơn CANCELLATION_REQUESTED", () => {
    const formatted = formatStaffNotificationText("CANCELLATION_REQUESTED", {
      orderCode: "DH8888",
      customerName: "Trần Thị B",
      reason: "Bận việc đột xuất",
    })

    expect(formatted.title).toContain("🚨")
    expect(formatted.title).toContain("huỷ đơn")
    expect(formatted.message).toContain("Bận việc đột xuất")
  })

  it("gửi đúng Sale khi đơn có sale phụ trách (OWNER)", () => {
    const activeChannels = new Set<StaffNotifyChannel>(["APP_INBOX", "ZALO", "TELEGRAM"])
    const targets = resolveStaffNotificationTargets(
      "ORDER_RECEIVED",
      {
        orderCode: "DH111",
        assignedSaleId: "user-sale-999",
      },
      activeChannels
    )

    const saleTarget = targets.find((t) => t.role === "SALE")
    expect(saleTarget).toBeDefined()
    expect(saleTarget?.recipientUserId).toBe("user-sale-999")
    expect(saleTarget?.channels).toContain("ZALO")
    expect(saleTarget?.channels).toContain("TELEGRAM")
    expect(saleTarget?.channels).toContain("APP_INBOX")
  })

  it("tự động broadcast cho toàn bộ Sale khi đơn chưa có người phụ trách (đơn vãng lai)", () => {
    const activeChannels = new Set<StaffNotifyChannel>(["APP_INBOX", "TELEGRAM"])
    const targets = resolveStaffNotificationTargets(
      "ORDER_RECEIVED",
      {
        orderCode: "DH222",
        assignedSaleId: null, // Không có Sale
      },
      activeChannels
    )

    const saleTarget = targets.find((t) => t.role === "SALE")
    expect(saleTarget).toBeDefined()
    expect(saleTarget?.recipientUserId).toBeNull() // Broadcast
    // Tiêu đề chuẩn hóa: không còn tiền tố mã kỹ thuật "[Chưa nhận]" (R8) — tình trạng
    // "chưa có người phụ trách" chuyển vào câu nội dung tự nhiên.
    expect(saleTarget?.title).not.toContain("[Chưa nhận]")
    expect(saleTarget?.message).toContain("chưa có người phụ trách")
    expect(saleTarget?.message).toContain("nhận đơn ngay")
  })

  it("lọc bỏ các kênh ngoài chưa được bật hoặc không được SaaS cấp phép", () => {
    // Chỉ bật kênh TELEGRAM, không bật ZALO hay SMS
    const activeChannels = new Set<StaffNotifyChannel>(["TELEGRAM"])
    const targets = resolveStaffNotificationTargets(
      "DELIVERY_FAILED",
      {
        orderCode: "DH333",
        assignedSaleId: "sale-1",
      },
      activeChannels
    )

    const saleTarget = targets.find((t) => t.role === "SALE")
    expect(saleTarget).toBeDefined()
    expect(saleTarget?.channels).toContain("APP_INBOX")
    expect(saleTarget?.channels).toContain("TELEGRAM")
    expect(saleTarget?.channels).not.toContain("SMS")
    expect(saleTarget?.channels).not.toContain("ZALO")
  })
})
