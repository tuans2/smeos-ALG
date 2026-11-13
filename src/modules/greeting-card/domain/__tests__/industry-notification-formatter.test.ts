import { describe, expect, it } from "vitest"
import { formatIndustryStaffNotificationText } from "../industry-notification-formatter"

describe("Industry Notification Formatter", () => {
  // ─── NGÀNH MẶC ĐỊNH (Hoa tươi / Quà tặng / Bán lẻ) ─────────────────────────

  describe("ngành mặc định (FLORAL / CRAFT_GIFT / RETAIL)", () => {
    it("ORDER_RECEIVED — tiêu đề chứa mã đơn và nội dung có tên khách + số tiền", () => {
      const { title, message } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        orderCode: "DH-001",
        customerName: "Nguyễn Thị A",
        productName: "Bó hoa hồng",
        amountVnd: 350_000,
      })
      expect(title).toContain("[Đơn DH-001]")
      expect(title).toContain("đơn hàng mới")
      expect(message).toContain("Nguyễn Thị A")
      expect(message).toContain("350.000 đ")
    })

    it("CANCELLATION_REQUESTED — icon 🚨 và hướng dẫn xử lý khẩn", () => {
      const { title, message } = formatIndustryStaffNotificationText("CANCELLATION_REQUESTED", {
        orderCode: "DH-002",
        customerName: "Trần B",
        reason: "Bận việc đột xuất",
        amountVnd: 500_000,
      })
      expect(title).toContain("🚨")
      expect(title).toContain("huỷ đơn")
      expect(message).toContain("Bận việc đột xuất")
    })

    it("DELIVERY_FAILED — icon 🚨 và hướng dẫn liên hệ lại khách", () => {
      const { title, message } = formatIndustryStaffNotificationText("DELIVERY_FAILED", {
        orderCode: "DH-003",
        customerName: "Lê C",
      })
      expect(title).toContain("🚨")
      expect(title).toContain("Giao hàng")
      expect(message).toContain("liên hệ lại")
    })

    it("STUCK_DETECTED — icon ⏱️ và cảnh báo quá hạn xử lý", () => {
      const { title, message } = formatIndustryStaffNotificationText("STUCK_DETECTED", {
        orderCode: "DH-004",
        productName: "Lẵng hoa lan",
      })
      expect(title).toContain("⏱️")
      expect(title).toContain("quá hạn xử lý")
      expect(message).toContain("kẹt")
    })

    it("PAYMENT_REPORTED — hướng dẫn đối soát chuyển khoản", () => {
      const { title, message } = formatIndustryStaffNotificationText("PAYMENT_REPORTED", {
        orderCode: "DH-005",
        customerName: "Phạm D",
        amountVnd: 200_000,
      })
      expect(title).toContain("chuyển khoản")
      expect(message).toContain("đối soát")
    })

    it("DISCOUNT_REQUESTED — hướng dẫn Điều hành xem xét", () => {
      const { title, message } = formatIndustryStaffNotificationText("DISCOUNT_REQUESTED", {
        orderCode: "DH-006",
        productName: "Hoa cầm tay",
        amountVnd: 50_000,
      })
      expect(title).toContain("giảm giá")
      expect(message).toContain("Điều hành")
    })

    it("fallback về session code khi không có order code", () => {
      const { title } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        sessionId: "sess-abc123",
      })
      expect(title).toContain("[Phiên sess-abc123]")
    })

    it("fallback về [Bộ sưu tập riêng] khi không có mã nào", () => {
      const { title } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {})
      expect(title).toContain("[Bộ sưu tập riêng]")
    })
  })

  // ─── NGÀNH HOMESTAY ────────────────────────────────────────────────────────

  describe("ngành HOMESTAY", () => {
    it("ORDER_RECEIVED — icon 🏡 và hiển thị ngày nhận/trả phòng", () => {
      const { title, message } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        orderCode: "STAY-001",
        customerName: "Khách lưu trú",
        productName: "Phòng Standard",
        amountVnd: 1_200_000,
        industryKey: "HOMESTAY",
        checkInDate: "20/10/2026",
        checkOutDate: "22/10/2026",
      })
      expect(title).toContain("🏡")
      expect(title).toContain("đặt phòng")
      expect(message).toContain("20/10/2026")
      expect(message).toContain("22/10/2026")
      expect(message).toContain("Quản gia")
    })

    it("CANCELLATION_REQUESTED — hướng dẫn hoàn cọc homestay", () => {
      const { title, message } = formatIndustryStaffNotificationText("CANCELLATION_REQUESTED", {
        orderCode: "STAY-002",
        customerName: "Khách huỷ phòng",
        industryKey: "HOMESTAY",
        reason: "Đổi lịch",
      })
      expect(title).toContain("huỷ đặt phòng")
      expect(message).toContain("hoàn cọc")
    })

    it("READY — icon ✨ và thông báo phòng sẵn sàng đón tiếp", () => {
      const { title, message } = formatIndustryStaffNotificationText("READY", {
        orderCode: "STAY-003",
        industryKey: "HOMESTAY",
      })
      expect(title).toContain("✨")
      expect(title).toContain("sẵn sàng đón tiếp")
      expect(message).toContain("Lễ tân")
    })

    it("DELIVERY_FAILED — cảnh báo khách chưa check-in", () => {
      const { title, message } = formatIndustryStaffNotificationText("DELIVERY_FAILED", {
        orderCode: "STAY-004",
        customerName: "Khách trễ",
        industryKey: "homestay", // lowercase vẫn phải hoạt động
      })
      expect(title).toContain("Check-in")
      expect(message).toContain("SĐT")
    })

    it("PAYMENT_CONFIRMED — hướng dẫn chuẩn bị phòng sau xác nhận cọc", () => {
      const { message } = formatIndustryStaffNotificationText("PAYMENT_CONFIRMED", {
        orderCode: "STAY-005",
        customerName: "Khách VIP",
        amountVnd: 2_000_000,
        industryKey: "HOMESTAY",
      })
      expect(message).toContain("chuẩn bị phòng")
    })
  })

  // ─── NGÀNH F&B ─────────────────────────────────────────────────────────────

  describe("ngành FNB (Ẩm thực)", () => {
    it("ORDER_RECEIVED — icon 🍲 và thông báo bếp tiếp nhận", () => {
      const { title, message } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        orderCode: "FNB-001",
        customerName: "Bàn 5",
        productName: "Bún bò Huế",
        industryKey: "FNB",
      })
      expect(title).toContain("🍲")
      expect(title).toContain("gọi món")
      expect(message).toContain("Bếp")
    })

    it("READY — icon 🍽️ và thông báo món đã hoàn thành", () => {
      const { title, message } = formatIndustryStaffNotificationText("READY", {
        orderCode: "FNB-002",
        customerName: "Bàn 3",
        industryKey: "FNB",
      })
      expect(title).toContain("🍽️")
      expect(title).toContain("chế biến xong")
      expect(message).toContain("xuất đơn")
    })

    it("DELIVERY_FAILED — thông báo giao món thất bại", () => {
      const { title, message } = formatIndustryStaffNotificationText("DELIVERY_FAILED", {
        orderCode: "FNB-003",
        industryKey: "FNB",
      })
      expect(title).toContain("Giao món")
      expect(message).toContain("liên hệ")
    })
  })

  // ─── NGÀNH THỜI TRANG ─────────────────────────────────────────────────────

  describe("ngành FASHION (Thời trang)", () => {
    it("ORDER_RECEIVED — icon 👗 và thông báo thợ may tiếp nhận", () => {
      const { title, message } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        orderCode: "FASH-001",
        customerName: "Khách may đo",
        productName: "Váy dạ hội",
        amountVnd: 5_000_000,
        industryKey: "FASHION",
      })
      expect(title).toContain("👗")
      expect(title).toContain("may đo")
      expect(message).toContain("Thợ may")
    })

    it("READY — thông báo trang phục may xong, chụp ảnh gửi khách", () => {
      const { title, message } = formatIndustryStaffNotificationText("READY", {
        orderCode: "FASH-002",
        productName: "Áo dài cưới",
        industryKey: "FASHION",
      })
      expect(title).toContain("✨")
      expect(title).toContain("may đo hoàn thiện")
      expect(message).toContain("Sale gửi ảnh")
    })
  })

  // ─── NGÀNH DỊCH VỤ / SPA ──────────────────────────────────────────────────

  describe("ngành SERVICES (Spa / Salon)", () => {
    it("ORDER_RECEIVED — icon 💆 và thông báo kỹ thuật viên tiếp nhận", () => {
      const { title, message } = formatIndustryStaffNotificationText("ORDER_RECEIVED", {
        orderCode: "SPA-001",
        customerName: "Khách massage",
        productName: "Gói full-body 90 phút",
        amountVnd: 800_000,
        industryKey: "SERVICES",
      })
      expect(title).toContain("💆")
      expect(title).toContain("dịch vụ")
      expect(message).toContain("Kỹ thuật viên")
    })

    it("READY — thông báo cơ sở sẵn sàng đón khách theo lịch", () => {
      const { message } = formatIndustryStaffNotificationText("READY", {
        orderCode: "SPA-002",
        industryKey: "SERVICES",
      })
      expect(message).toContain("chuyên viên sẵn sàng")
    })
  })
})
