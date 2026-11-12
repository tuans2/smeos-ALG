import { describe, it, expect } from "vitest"
import {
  deriveCustomerTier,
  deriveCustomerLifecycleStage,
  isValidVietnamesePhone,
  normalizeVietnamesePhone,
  calculateDaysUntilOccasion,
  hasMarketingConsent,
} from "@/modules/crm/domain/crm-rules"
import {
  projectCustomerSalesCard,
  projectOccasionReminder,
  projectMarketingAudience,
  projectCustomerCoordinationBrief,
  type CustomerMasterIndex,
} from "@/modules/crm/domain/customer-master-index"

describe("CRM Domain Rules — Ngành hoa M09", () => {
  describe("Phân hạng RFM (deriveCustomerTier)", () => {
    it("đạt VIP khi chi tiêu >= 10 triệu hoặc >= 10 đơn", () => {
      expect(deriveCustomerTier(12_000_000, 2)).toBe("VIP")
      expect(deriveCustomerTier(2_000_000, 10)).toBe("VIP")
    })

    it("đạt GOLD khi chi tiêu >= 5 triệu hoặc >= 5 đơn", () => {
      expect(deriveCustomerTier(6_000_000, 2)).toBe("GOLD")
      expect(deriveCustomerTier(1_000_000, 6)).toBe("GOLD")
    })

    it("đạt SILVER khi chi tiêu >= 2 triệu hoặc >= 3 đơn", () => {
      expect(deriveCustomerTier(2_500_000, 1)).toBe("SILVER")
      expect(deriveCustomerTier(800_000, 3)).toBe("SILVER")
    })

    it("đạt BRONZE khi chi tiêu >= 500k hoặc >= 1 đơn", () => {
      expect(deriveCustomerTier(600_000, 1)).toBe("BRONZE")
    })

    it("xếp hạng NEW khi chưa có đơn hàng nào", () => {
      expect(deriveCustomerTier(0, 0)).toBe("NEW")
    })
  })

  describe("Giai đoạn vòng đời khách hàng (deriveCustomerLifecycleStage)", () => {
    const fixedNow = new Date("2026-09-27T12:00:00Z")

    it("khách 0 đơn hoặc chưa có lastOrderAt là ACQUIRE", () => {
      expect(deriveCustomerLifecycleStage({ orderCount: 0, totalSpentVnd: 0 }, fixedNow)).toBe("ACQUIRE")
      expect(deriveCustomerLifecycleStage({ orderCount: 1, totalSpentVnd: 500_000, lastOrderAt: null }, fixedNow)).toBe("ACQUIRE")
    })

    it("khách mới 1 đơn mua trong vòng 30 ngày là ACQUIRE", () => {
      const lastOrder = new Date("2026-09-10T12:00:00Z").toISOString() // 17 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 1, totalSpentVnd: 500_000, lastOrderAt: lastOrder }, fixedNow)).toBe("ACQUIRE")
    })

    it("khách 1 đơn nhưng quá 30 ngày (dưới 90 ngày) là AT_RISK", () => {
      const lastOrder = new Date("2026-08-01T12:00:00Z").toISOString() // 57 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 1, totalSpentVnd: 500_000, lastOrderAt: lastOrder }, fixedNow)).toBe("AT_RISK")
    })

    it("khách 2-4 đơn mua trong vòng 60 ngày là GROW", () => {
      const lastOrder = new Date("2026-09-01T12:00:00Z").toISOString() // 26 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 3, totalSpentVnd: 1_800_000, lastOrderAt: lastOrder }, fixedNow)).toBe("GROW")
    })

    it("khách VIP/GOLD mua trong vòng 90 ngày là RETAIN", () => {
      const lastOrder = new Date("2026-07-20T12:00:00Z").toISOString() // 69 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 6, totalSpentVnd: 6_000_000, lastOrderAt: lastOrder }, fixedNow)).toBe("RETAIN")
    })

    it("khách VIP/GOLD không mua trong 91-180 ngày là AT_RISK", () => {
      const lastOrder = new Date("2026-05-20T12:00:00Z").toISOString() // 130 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 6, totalSpentVnd: 6_000_000, lastOrderAt: lastOrder }, fixedNow)).toBe("AT_RISK")
    })

    it("audit BL-31: có hạng (tính theo ngưỡng ngành) thì dùng hạng, không dùng ngưỡng cứng ngành hoa", () => {
      const lastOrder = new Date("2026-05-20T12:00:00Z").toISOString() // 130 ngày trước
      // Ngành ngưỡng cao: 6 đơn / 6 triệu mới là Bạc → không phải khách giá trị cao → nhánh 2+ đơn: quá 120 ngày là DORMANT
      expect(deriveCustomerLifecycleStage({ orderCount: 6, totalSpentVnd: 6_000_000, tier: "SILVER", lastOrderAt: lastOrder }, fixedNow)).toBe("DORMANT")
      // Ngành ngưỡng thấp: 2 đơn đã là Vàng → khách giá trị cao → 91-180 ngày là AT_RISK
      expect(deriveCustomerLifecycleStage({ orderCount: 2, totalSpentVnd: 800_000, tier: "GOLD", lastOrderAt: lastOrder }, fixedNow)).toBe("AT_RISK")
    })

    it("khách VIP/GOLD không mua > 180 ngày là DORMANT", () => {
      const lastOrder = new Date("2026-01-01T12:00:00Z").toISOString() // ~270 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 6, totalSpentVnd: 6_000_000, lastOrderAt: lastOrder }, fixedNow)).toBe("DORMANT")
    })

    it("khách thường không mua > 120 ngày là DORMANT", () => {
      const lastOrder = new Date("2026-04-01T12:00:00Z").toISOString() // ~180 ngày trước
      expect(deriveCustomerLifecycleStage({ orderCount: 2, totalSpentVnd: 1_000_000, lastOrderAt: lastOrder }, fixedNow)).toBe("DORMANT")
    })
  })

  describe("Số điện thoại Việt Nam", () => {
    it("nhận diện đúng các đầu số di động hợp lệ (09x, 08x, 07x, 03x, 05x)", () => {
      expect(isValidVietnamesePhone("0909123456")).toBe(true)
      expect(isValidVietnamesePhone("+84988776655")).toBe(true)
      expect(isValidVietnamesePhone("84345678901")).toBe(true)
      expect(isValidVietnamesePhone("0123456789")).toBe(false) // Đầu 01 cũ
      expect(isValidVietnamesePhone("abcdefghij")).toBe(false)
    })

    it("chuẩn hóa về dạng 0xxxxxxxxx", () => {
      expect(normalizeVietnamesePhone("+84909123456")).toBe("0909123456")
      expect(normalizeVietnamesePhone("84909123456")).toBe("0909123456")
      expect(normalizeVietnamesePhone("0909 123 456")).toBe("0909123456")
    })
  })

  describe("Tính số ngày đến dịp kỷ niệm (calculateDaysUntilOccasion)", () => {
    it("tính chính xác khoảng cách ngày", () => {
      const mockNow = new Date(2026, 9, 13) // Ngày 13/10
      const days = calculateDaysUntilOccasion("10-20", mockNow) // 20/10
      expect(days).toBe(7)
    })
  })

  describe("Quyền tiếp thị (hasMarketingConsent)", () => {
    it("cho phép gửi tin khi đã granted và từ chối khi chưa có consent", () => {
      const consents = [
        { channel: "ZALO_ZNS" as const, granted: true, grantedAt: "2026-01-01" },
        { channel: "PROMOTION" as const, granted: false, grantedAt: "2026-01-01" },
      ]
      expect(hasMarketingConsent(consents, "ZALO_ZNS")).toBe(true)
      expect(hasMarketingConsent(consents, "PROMOTION")).toBe(false)
      expect(hasMarketingConsent(consents, "SMS")).toBe(false)
    })

    it("ĐP-1.5 (MI-1, 26/09/2026): đã granted nhưng đã revoked thì vẫn phải từ chối", () => {
      const consents = [
        { channel: "ZALO_ZNS" as const, granted: true, grantedAt: "2026-01-01", revokedAt: "2026-06-01" },
      ]
      expect(hasMarketingConsent(consents, "ZALO_ZNS")).toBe(false)
    })
  })

  describe("Field Projections", () => {
    const mockCustomer: CustomerMasterIndex = {
      id: "c-1",
      organizationId: "org-1",
      code: "KH-0001",
      name: "Chị Lan",
      phone: "0909111222",
      updatedAt: "2026-09-20T00:00:00.000Z",
      tags: ["VIP"],
      metrics: {
        tier: "VIP",
        totalSpentVnd: 15_000_000,
        orderCount: 12,
        aovVnd: 1_250_000,
      },
      preferences: {
        preferredFlowers: ["Hồng Ecuador", "Baby Hà Lan"],
        preferredColors: ["Đỏ nhung"],
      },
      occasions: [
        { id: "o-1", name: "Sinh nhật sếp", date: "10-20", isRecurring: true, reminderDaysBefore: 7 },
      ],
      consents: [
        { channel: "ZALO_ZNS", granted: true, grantedAt: "2026-01-01" },
      ],
      availableVouchers: [
        { code: "VIP10", discountType: "PERCENTAGE", discountValue: 10, minOrderVnd: 300_000, maxDiscountVnd: 200_000 },
      ],
    }

    it("projectCustomerSalesCard trích xuất đúng lát cắt bán hàng", () => {
      const card = projectCustomerSalesCard(mockCustomer)
      expect(card.name).toBe("Chị Lan")
      expect(card.tier).toBe("VIP")
      expect(card.favFlowersSummary).toBe("Hồng Ecuador, Baby Hà Lan")
      expect(card.vouchersCount).toBe(1)
    })

    it("projectOccasionReminder tạo lời nhắc kèm gợi ý hoa", () => {
      const rem = projectOccasionReminder(mockCustomer, mockCustomer.occasions[0]!, 7)
      expect(rem.occasionName).toBe("Sinh nhật sếp")
      expect(rem.daysLeft).toBe(7)
      expect(rem.suggestedFlower).toBe("Hồng Ecuador")
      expect(rem.suggestedTone).toBe("Đỏ nhung")
      expect(rem.isZaloAllowed).toBe(true)
    })

    it("T6.12b (nợ #164b): khách chưa khai sở thích thì trả null, không bịa hoa hồng hay pastel", () => {
      const noPrefCustomer: CustomerMasterIndex = {
        ...mockCustomer,
        preferences: {
          preferredFlowers: [],
          preferredColors: [],
        },
      }
      const rem = projectOccasionReminder(noPrefCustomer, noPrefCustomer.occasions[0]!, 7)
      expect(rem.suggestedFlower).toBeNull()
      expect(rem.suggestedTone).toBeNull()
    })

    it("projectMarketingAudience chỉ lấy khách có consent", () => {
      expect(projectMarketingAudience(mockCustomer, "ZALO_ZNS")).not.toBeNull()
      expect(projectMarketingAudience(mockCustomer, "SMS")).toBeNull()
    })

    it("ĐP-1.5 (MI-1, 26/09/2026): khách ĐÃ cấp nhưng ĐÃ thu hồi Zalo ZNS thì không nhắc, không đưa vào tiếp thị", () => {
      const revokedCustomer: CustomerMasterIndex = {
        ...mockCustomer,
        consents: [{ channel: "ZALO_ZNS", granted: true, grantedAt: "2026-01-01", revokedAt: "2026-06-01" }],
      }
      const rem = projectOccasionReminder(revokedCustomer, revokedCustomer.occasions[0]!, 7)
      expect(rem.isZaloAllowed).toBe(false)
      expect(projectMarketingAudience(revokedCustomer, "ZALO_ZNS")).toBeNull()
    })

    it("ĐP-1.6 (MI-2, 26/09/2026): projectCustomerSalesCard mang theo đủ minOrderVnd/maxDiscountVnd của voucher (qua CustomerMasterIndex)", () => {
      expect(mockCustomer.availableVouchers[0]!.minOrderVnd).toBe(300_000)
      expect(mockCustomer.availableVouchers[0]!.maxDiscountVnd).toBe(200_000)
    })

    it("ĐP-2.4 (MI-6, 26/09/2026): projectCustomerCoordinationBrief trích đúng tóm tắt cho Điều phối", () => {
      const brief = projectCustomerCoordinationBrief(mockCustomer)
      expect(brief.tier).toBe("VIP")
      expect(brief.isVip).toBe(true)
      expect(brief.preferredFlowers).toEqual(["Hồng Ecuador", "Baby Hà Lan"])
    })

    it("ĐP-2.4 (MI-6, 26/09/2026): khách chưa có notes thật thì trả rỗng, không bịa \"Khách hàng thân thiết\"", () => {
      const brief = projectCustomerCoordinationBrief({ ...mockCustomer, notes: undefined })
      expect(brief.notes).toBe("")
    })
  })
})
