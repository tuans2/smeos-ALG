import { describe, it, expect } from "vitest"
import {
  generateSendCode,
  validateSendCode,
  createProductSnapshot,
  canTransitionSessionStatus,
  validateCustomerOrderInput,
  mapOrderStatusToTrackingStep,
  validateDeliveryDate,
} from "../greeting-card-rules"

describe("Greeting Card Domain Rules", () => {
  describe("generateSendCode", () => {
    const fixedBytes = (n: number) => new Uint8Array(n).map((_, i) => i)

    it("sinh mã tiền tố + 8 ký tự ngẫu nhiên, khớp regex", () => {
      expect(generateSendCode("T01", fixedBytes)).toBe("T01-01234567")
      expect(validateSendCode(generateSendCode("siin"))).toBe(true)
    })

    it("chuẩn hoá tiền tố lạ về T01", () => {
      expect(generateSendCode("!", fixedBytes).startsWith("T01-")).toBe(true)
    })

    it("hai lần sinh liên tiếp không trùng", () => {
      expect(generateSendCode()).not.toBe(generateSendCode())
    })
  })

  describe("validateSendCode", () => {
    it("should accept valid send codes (kể cả mã số cũ)", () => {
      expect(validateSendCode("T01-037")).toBe(true)
      expect(validateSendCode("SIIN-001")).toBe(true)
      expect(validateSendCode("T01-K7Q9XMZ2")).toBe(true)
    })

    it("should reject invalid format", () => {
      expect(validateSendCode("")).toBe(false)
      expect(validateSendCode("invalid")).toBe(false)
      expect(validateSendCode("T-1")).toBe(false)
      expect(validateSendCode("T01-../../x")).toBe(false)
    })
  })

  describe("createProductSnapshot", () => {
    it("should freeze product data into snapshot", () => {
      const mockProduct = {
        id: "prod-1",
        code: "HOA-001",
        name: "Bó Hồng Pastel",
        price: 850000,
        imageUrl: "/sample.jpg",
        description: "Hoa hồng Ecuador",
        sortOrder: 1,
      }
      const snapshot = createProductSnapshot(mockProduct, "2026-10-03T10:00:00Z")
      expect(snapshot.id).toBe("prod-1")
      expect(snapshot.price).toBe(850000)
      expect(snapshot.selectedAt).toBe("2026-10-03T10:00:00Z")
    })
  })

  describe("canTransitionSessionStatus", () => {
    it("should allow valid transitions", () => {
      expect(canTransitionSessionStatus("CREATED", "OPENED")).toBe(true)
      expect(canTransitionSessionStatus("OPENED", "SELECTED")).toBe(true)
      expect(canTransitionSessionStatus("SELECTED", "ORDER_SUBMITTED")).toBe(true)
      expect(canTransitionSessionStatus("ORDER_SUBMITTED", "PAYMENT_REPORTED")).toBe(true)
    })

    it("should disallow invalid jumps", () => {
      expect(canTransitionSessionStatus("CREATED", "COMPLETED")).toBe(false)
      expect(canTransitionSessionStatus("COMPLETED", "OPENED")).toBe(false)
    })
  })

  describe("validateCustomerOrderInput", () => {
    const NOW = new Date("2026-10-05T03:00:00Z")

    it("should validate complete input successfully", () => {
      const result = validateCustomerOrderInput({
        customerName: "Nguyễn Văn A",
        customerPhone: "0901234567",
        recipientName: "Trần Thị B",
        recipientPhone: "0912345678",
        deliveryDate: "2026-10-20",
        deliveryAddress: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1",
      }, NOW)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors).length).toBe(0)
    })

    it("should catch missing fields and invalid phone numbers", () => {
      const result = validateCustomerOrderInput({
        customerName: "",
        customerPhone: "123",
        recipientName: "",
        recipientPhone: "invalid",
        deliveryDate: "",
        deliveryAddress: "abc",
      })
      expect(result.valid).toBe(false)
      expect(result.errors.customerName).toBeDefined()
      expect(result.errors.customerPhone).toBeDefined()
      expect(result.errors.recipientName).toBeDefined()
      expect(result.errors.deliveryDate).toBeDefined()
      expect(result.errors.deliveryAddress).toBeDefined()
    })

    it("từ chối SĐT có ký tự | (lỗi regex cũ [3|5|7|8|9])", () => {
      const result = validateCustomerOrderInput({
        customerName: "A", customerPhone: "0|12345678", recipientName: "B", recipientPhone: "0912345678",
        deliveryDate: "2026-10-20", deliveryAddress: "123 Nguyễn Huệ",
      }, NOW)
      expect(result.errors.customerPhone).toBeDefined()
    })

    it("từ chối lời nhắn thiệp quá dài", () => {
      const result = validateCustomerOrderInput({
        customerName: "A", customerPhone: "0901234567", recipientName: "B", recipientPhone: "0912345678",
        deliveryDate: "2026-10-20", deliveryAddress: "123 Nguyễn Huệ", cardMessage: "x".repeat(501),
      }, NOW)
      expect(result.errors.cardMessage).toBeDefined()
    })

    it("báo lỗi khi link bản đồ không phải Google Maps, nhận link chia sẻ hợp lệ", () => {
      const base = {
        customerName: "A", customerPhone: "0901234567", recipientName: "B", recipientPhone: "0912345678",
        deliveryDate: "2026-10-20", deliveryAddress: "123 Nguyễn Huệ",
      }
      expect(validateCustomerOrderInput({ ...base, mapUrl: "https://evil.example/maps" }, NOW).errors.mapUrl).toBeDefined()
      expect(validateCustomerOrderInput({ ...base, mapUrl: "https://maps.app.goo.gl/AbC123" }, NOW).valid).toBe(true)
      expect(validateCustomerOrderInput({ ...base, deliveryNote: "x".repeat(301) }, NOW).errors.deliveryNote).toBeDefined()
    })

    it("chấp nhận email hợp lệ và từ chối email sai định dạng", () => {
      const base = {
        customerName: "A", customerPhone: "0901234567", recipientName: "B", recipientPhone: "0912345678",
        deliveryDate: "2026-10-20", deliveryAddress: "123 Nguyễn Huệ",
      }
      expect(validateCustomerOrderInput({ ...base, customerEmail: "invalid-email" }, NOW).errors.customerEmail).toBeDefined()
      expect(validateCustomerOrderInput({ ...base, customerEmail: "lan@example.com" }, NOW).valid).toBe(true)
      expect(validateCustomerOrderInput({ ...base, customerEmail: "" }, NOW).valid).toBe(true)
      expect(validateCustomerOrderInput(base, NOW).valid).toBe(true)
    })
  })

  describe("validateDeliveryDate", () => {
    const NOW = new Date("2026-10-05T18:30:00Z") // 01:30 ngày 06/10 giờ Việt Nam

    it("tính 'hôm nay' theo giờ Việt Nam", () => {
      expect(validateDeliveryDate("2026-10-05", NOW)).toMatch(/quá khứ/)
      expect(validateDeliveryDate("2026-10-06", NOW)).toBeNull()
    })

    it("từ chối ngày không tồn tại, sai định dạng, quá xa", () => {
      expect(validateDeliveryDate("2026-02-30", NOW)).not.toBeNull()
      expect(validateDeliveryDate("06/10/2026", NOW)).not.toBeNull()
      expect(validateDeliveryDate("2028-01-01", NOW)).toMatch(/tối đa/)
    })
  })

  describe("mapOrderStatusToTrackingStep", () => {
    it("should map delivered status to the last step (5)", () => {
      const step = mapOrderStatusToTrackingStep("COMPLETED", "READY", "DELIVERED")
      expect(step.stepIndex).toBe(5)
      expect(step.percentage).toBe(100)
    })

    it("should map arranging and quality-check to step 3", () => {
      expect(mapOrderStatusToTrackingStep("PROCESSING", "ARRANGING", "PENDING").stepIndex).toBe(3)
      expect(mapOrderStatusToTrackingStep("PROCESSING", "QUALITY_CHECK", "PENDING").stepIndex).toBe(3)
    })

    it("keeps an unpaid draft order at step 1 (received, not yet confirmed)", () => {
      const step = mapOrderStatusToTrackingStep("DRAFT", "WAITING", "PENDING")
      expect(step.stepIndex).toBe(1)
      expect(step.percentage).toBe(20)
    })

    it("shows 'Đã xác nhận' (step 2) once payment/deposit is recorded", () => {
      const step = mapOrderStatusToTrackingStep("CONFIRMED", "WAITING", "PENDING")
      expect(step.stepIndex).toBe(2)
      expect(step.title).toMatch(/xác nhận/)
    })

    it("treats an assigned florist as confirmed for shops that do not collect payment first", () => {
      expect(mapOrderStatusToTrackingStep("DRAFT", "ASSIGNED", "PENDING").stepIndex).toBe(2)
    })

    it("maps dispatched orders to step 4 and cancelled orders to -1", () => {
      expect(mapOrderStatusToTrackingStep("PROCESSING", "READY", "DISPATCHED").stepIndex).toBe(4)
      expect(mapOrderStatusToTrackingStep("CANCELLED", "WAITING", "PENDING").stepIndex).toBe(-1)
    })
  })
})
