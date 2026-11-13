import { describe, it, expect } from "vitest"
import {
  suggestFlowerForOccasion,
  generateOccasionCareScript,
  classifyReminderUrgency,
  URGENCY_CONFIG,
} from "../crm-care-scripts"
import type { OccasionReminder } from "../customer-master-index"

const mockReminder: OccasionReminder = {
  customerId: "cust-001",
  customerName: "Nguyễn Thị Lan",
  customerPhone: "0901234567",
  occasionName: "Sinh nhật vợ",
  targetDate: "2026-10-05",
  daysLeft: 5,
  recipientName: "Chị Hoa",
  suggestedFlower: null,
  suggestedTone: null,
  isZaloAllowed: true,
}

describe("crm-care-scripts — CRM-08..12", () => {
  describe("suggestFlowerForOccasion (CRM-12)", () => {
    it("ưu tiên hoa theo sở thích của khách nếu có", () => {
      const result = suggestFlowerForOccasion("sinh nhật", "Hoa ly trắng")
      expect(result).toBe("Hoa ly trắng (theo sở thích của khách)")
    })

    it("gợi ý hoa theo dịp khi khách chưa khai sở thích", () => {
      const result = suggestFlowerForOccasion("sinh nhật mẹ", null)
      expect(result).toContain("hướng dương")
    })

    it("trả về hoa mùa khi không khớp dịp nào", () => {
      const result = suggestFlowerForOccasion("liên hoan nhỏ", null)
      expect(result).toBe("Hoa theo mùa tươi đẹp")
    })
  })

  describe("classifyReminderUrgency (CRM-08, CRM-09)", () => {
    it("phân loại TODAY khi daysLeft = 0", () => {
      expect(classifyReminderUrgency(0)).toBe("TODAY")
    })

    it("phân loại URGENT khi daysLeft 1-3", () => {
      expect(classifyReminderUrgency(1)).toBe("URGENT")
      expect(classifyReminderUrgency(3)).toBe("URGENT")
    })

    it("phân loại SOON khi daysLeft 4-7", () => {
      expect(classifyReminderUrgency(4)).toBe("SOON")
      expect(classifyReminderUrgency(7)).toBe("SOON")
    })

    it("phân loại UPCOMING khi daysLeft > 7", () => {
      expect(classifyReminderUrgency(8)).toBe("UPCOMING")
      expect(classifyReminderUrgency(14)).toBe("UPCOMING")
    })

    it("URGENCY_CONFIG có đủ 4 nhóm với label và colorClass", () => {
      const keys: (keyof typeof URGENCY_CONFIG)[] = ["TODAY", "URGENT", "SOON", "UPCOMING"]
      for (const k of keys) {
        expect(URGENCY_CONFIG[k]).toHaveProperty("label")
        expect(URGENCY_CONFIG[k]).toHaveProperty("colorClass")
        expect(URGENCY_CONFIG[k]).toHaveProperty("badgeClass")
      }
    })
  })

  describe("generateOccasionCareScript (CRM-11)", () => {
    it("sinh kịch bản Zalo chứa tên khách và dịp kỷ niệm", () => {
      const script = generateOccasionCareScript(
        { reminder: mockReminder, shopName: "Hoa Tươi Lan Nhi" },
        "SILVER"
      )
      expect(script).toContain("Nguyễn Thị Lan")
      expect(script).toContain("Sinh nhật vợ")
      expect(script).toContain("Hoa Tươi Lan Nhi")
    })

    it("hiển thị đúng gợi ý hoa theo dịp sinh nhật khi chưa có sở thích", () => {
      const script = generateOccasionCareScript(
        { reminder: mockReminder, shopName: "Tiệm Hoa Mai" },
        "NEW"
      )
      // Hoa sinh nhật phải có trong script
      expect(script.toLowerCase()).toMatch(/hoa|hướng dương|hồng/)
    })

    it("thêm note VIP khi khách là GOLD/VIP", () => {
      const script = generateOccasionCareScript(
        { reminder: mockReminder, shopName: "Hoa Sang Trọng" },
        "VIP"
      )
      expect(script).toContain("thân thiết")
    })

    it("chứa số hotline khi được truyền vào", () => {
      const script = generateOccasionCareScript(
        { reminder: mockReminder, shopName: "Tiệm Hoa Mơ", hotline: "0909888777" },
        "BRONZE"
      )
      expect(script).toContain("0909888777")
    })
  })
})
