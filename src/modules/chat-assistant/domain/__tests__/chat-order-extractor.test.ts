import { describe, it, expect } from "vitest"
import {
  extractVietnamesePhone,
  extractRecipientName,
  extractDeliveryAddress,
  extractDeliveryTime,
  extractCardMessage,
  extractOrderDraftFromChat,
  validateChatOrderDraft,
  generateChatOrderCheckout,
} from "../chat-order-extractor"

describe("Chat Order Extractor & Checkout (DH-03, DH-04)", () => {
  describe("extractVietnamesePhone", () => {
    it("trích xuất chính xác số điện thoại 10 số đầu 09/03/07/08/05", () => {
      expect(extractVietnamesePhone("giao qua sđt 0901234567 nha")).toBe("0901234567")
      expect(extractVietnamesePhone("gọi cho mình: 038 999 1234")).toBe("0389991234")
      expect(extractVietnamesePhone("liên hệ +84912345678")).toBe("0912345678")
    })

    it("trả về null khi không có số điện thoại hợp lệ", () => {
      expect(extractVietnamesePhone("sản phẩm đẹp lắm shop")).toBeNull()
    })
  })

  describe("extractRecipientName", () => {
    it("trích xuất tên người nhận từ các mẫu câu tiếng Việt tự nhiên", () => {
      expect(extractRecipientName("Giao cho chị Hoàng Lan nha shop")).toBe("Hoàng Lan")
      expect(extractRecipientName("người nhận: Nguyễn Thị Thảo")).toBe("Nguyễn Thị Thảo")
      expect(extractRecipientName("tên người nhận là anh Minh")).toBe("Minh")
    })
  })

  describe("extractDeliveryAddress", () => {
    it("trích xuất địa chỉ đường phố, toà nhà", () => {
      const addr = extractDeliveryAddress("giao đến 123 Lê Lợi, Phường Bến Nghé, Quận 1")
      expect(addr).toContain("123 Lê Lợi")
      expect(extractDeliveryAddress("tòa nhà Landmark 81, tầng 15")).toContain("Landmark 81")
    })
  })

  describe("extractDeliveryTime & extractCardMessage", () => {
    it("trích xuất thời gian giao hoa", () => {
      const time = extractDeliveryTime("giao lúc 9h sáng mai giúp mình nhé")
      expect(time).toBeTruthy()
      expect(time).toContain("9h")
    })

    it("trích xuất nội dung thiệp chúc mừng", () => {
      const msg = extractCardMessage('thiệp ghi: "Chúc mừng sinh nhật mẹ yêu, chúc mẹ luôn mạnh khỏe"')
      expect(msg).toContain("Chúc mừng sinh nhật mẹ yêu")
    })
  })

  describe("extractOrderDraftFromChat", () => {
    it("trích xuất tổng thể đơn hàng từ lịch sử chat hoàn chỉnh", () => {
      const messages = [
        { senderType: "USER", content: "Shop ơi tư vấn mình sản phẩm tặng sinh nhật tầm 600k" },
        { senderType: "ASSISTANT", content: "Dạ shop có sản phẩm hồng pastel rất đẹp ạ" },
        { senderType: "USER", content: "Ok lấy mẫu đó giao cho chị Mai sđt 0987654321 nhé" },
        { senderType: "USER", content: "Địa chỉ: 456 Hai Bà Trưng, Quận 3. Giao lúc 10h sáng mai nha" },
        { senderType: "USER", content: 'Ghi thiệp: "Chúc Mai sinh nhật rực rỡ và luôn hạnh phúc"' },
      ]

      const draft = extractOrderDraftFromChat(messages)

      expect(draft.recipientPhone).toBe("0987654321")
      expect(draft.recipientName).toBe("Mai")
      expect(draft.deliveryAddress).toContain("456 Hai Bà Trưng")
      expect(draft.budgetVnd).toBe(600_000)
      expect(draft.occasion).toBe("Sinh nhật")
      expect(draft.flowerStyleOrTone).toContain("Hồng Pastel")
      expect(draft.cardMessage).toContain("Chúc Mai sinh nhật rực rỡ")

      const validation = validateChatOrderDraft(draft)
      expect(validation.isReadyForCheckout).toBe(true)
      expect(validation.confidenceScore).toBeGreaterThanOrEqual(80)
      expect(validation.completedFields).toContain("Số điện thoại người nhận")
      expect(validation.completedFields).toContain("Địa chỉ giao hàng")
    })
  })

  describe("generateChatOrderCheckout (DH-04)", () => {
    it("sinh payload checkout đơn hàng và mã VietQR Napas 247 chính xác", () => {
      const draft = {
        recipientName: "Chị Lan",
        recipientPhone: "0901234567",
        deliveryAddress: "789 Nguyễn Huệ, Q.1",
        deliveryTime: "14h chiều nay",
        occasion: "Sinh nhật",
        cardMessage: "Chúc mừng sinh nhật",
        flowerStyleOrTone: "Tone Hồng Pastel",
        budgetVnd: 750_000,
      }

      const checkout = generateChatOrderCheckout(draft, "FLORAWEEK")

      expect(checkout.orderCode).toMatch(/^DH-\d+-\d+$/)
      expect(checkout.totalVnd).toBe(750_000)
      expect(checkout.vietqrPayload.bankCode).toBe("ICB")
      expect(checkout.vietqrPayload.amount).toBe(750_000)
      expect(checkout.vietqrPayload.paymentTransferCode).toContain("SME FLORAW")
      expect(checkout.vietqrPayload.qrQuickLink).toContain("img.vietqr.io")
    })
  })
})
