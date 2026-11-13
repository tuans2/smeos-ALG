import { describe, it, expect } from "vitest"
import {
  DEFAULT_DISPATCH_REMINDER_POLICY,
  type OrderReminderCalculationInput,
} from "../dispatch-reminder-types"
import {
  resolveEffectiveReminderConfig,
  calculateMilestoneSchedule,
} from "../dispatch-reminder-resolver"
import { evaluateOrderReminders } from "../dispatch-reminder-evaluator"

describe("dispatch-reminder domain", () => {
  describe("resolveEffectiveReminderConfig — Kế thừa 2 cấp", () => {
    it("trả về cấu hình mặc định SSOT khi không có override và policy", () => {
      const config = resolveEffectiveReminderConfig(null, null)
      expect(config).toEqual(DEFAULT_DISPATCH_REMINDER_POLICY)
      expect(config.m0MinutesAfterPaid).toBe(10)
      expect(config.m1MinutesBeforeDelivery).toBe(120)
      expect(config.m2MinutesBeforeDelivery).toBe(60)
      expect(config.m3MinutesAfterShipperAssigned).toBe(20)
      expect(config.m5MinutesAfterDelivery).toBe(30)
    })

    it("áp dụng Policy cấp tổ chức khi được cấu hình", () => {
      const config = resolveEffectiveReminderConfig(null, {
        m0MinutesAfterPaid: 15,
        m2MinutesBeforeDelivery: 75,
      })
      expect(config.m0MinutesAfterPaid).toBe(15)
      expect(config.m1MinutesBeforeDelivery).toBe(120) // giữ mặc định
      expect(config.m2MinutesBeforeDelivery).toBe(75)
    })

    it("ghi đè cấp Thẻ chào (Template Overrides) có độ ưu tiên cao nhất", () => {
      const config = resolveEffectiveReminderConfig(
        {
          m1MinutesBeforeDelivery: 180, // Sản phẩm VIP cần 3 tiếng
        },
        {
          m1MinutesBeforeDelivery: 100, // Policy tiệm
        }
      )
      expect(config.m1MinutesBeforeDelivery).toBe(180)
    })
  })

  describe("calculateMilestoneSchedule — Tính toán thời điểm trigger", () => {
    const config = DEFAULT_DISPATCH_REMINDER_POLICY
    const baseDeliveryTime = new Date("2026-10-12T15:00:00.000Z")
    const paidAt = new Date("2026-10-12T12:00:00.000Z")
    const shipperAssignedAt = new Date("2026-10-12T14:15:00.000Z")

    it("tính toán đúng các mốc thời gian M0..M5", () => {
      const input: OrderReminderCalculationInput = {
        orderId: "ord-1",
        orderCode: "FL-001",
        paidAt,
        deliveryTime: baseDeliveryTime,
        shipperAssignedAt,
        shipperName: "Anh Nam",
        shipperPhone: "0901234567",
      }

      const schedule = calculateMilestoneSchedule(input, config)

      // M0 = 12:00 + 10' = 12:10
      expect(schedule.m0?.toISOString()).toBe("2026-10-12T12:10:00.000Z")
      // M1 = 15:00 - 120' = 13:00
      expect(schedule.m1?.toISOString()).toBe("2026-10-12T13:00:00.000Z")
      // M2 = 15:00 - 60' = 14:00
      expect(schedule.m2?.toISOString()).toBe("2026-10-12T14:00:00.000Z")
      // M3 = 14:15 + 20' = 14:35
      expect(schedule.m3?.toISOString()).toBe("2026-10-12T14:35:00.000Z")
      // M4 = 14:15 (ngay khi gán shipper)
      expect(schedule.m4?.toISOString()).toBe("2026-10-12T14:15:00.000Z")
      // M5 = 15:00 + 30' = 15:30
      expect(schedule.m5?.toISOString()).toBe("2026-10-12T15:30:00.000Z")
    })

    it("trả về null cho mốc khi thiếu dữ liệu đầu vào", () => {
      const input: OrderReminderCalculationInput = {
        orderId: "ord-2",
        orderCode: "FL-002",
        paidAt: null,
        deliveryTime: null,
        shipperAssignedAt: null,
      }

      const schedule = calculateMilestoneSchedule(input, config)
      expect(schedule.m0).toBeNull()
      expect(schedule.m1).toBeNull()
      expect(schedule.m2).toBeNull()
      expect(schedule.m3).toBeNull()
      expect(schedule.m4).toBeNull()
      expect(schedule.m5).toBeNull()
    })
  })

  describe("evaluateOrderReminders — Đánh giá kích hoạt và trạng thái", () => {
    const config = DEFAULT_DISPATCH_REMINDER_POLICY
    const baseDeliveryTime = new Date("2026-10-12T15:00:00.000Z")
    const paidAt = new Date("2026-10-12T12:00:00.000Z")
    const shipperAssignedAt = new Date("2026-10-12T14:15:00.000Z")

    const sampleInput: OrderReminderCalculationInput = {
      orderId: "ord-1",
      orderCode: "FL-100",
      paidAt,
      deliveryTime: baseDeliveryTime,
      shipperAssignedAt,
      shipperName: "Bác Hùng",
      shipperPhone: "0912345678",
      coordinatorPhone: "0987654321",
      customerName: "Chị Lan",
      customerPhone: "0933221100",
    }

    const schedule = calculateMilestoneSchedule(sampleInput, config)

    it("tin nhắc xưởng ghi giờ giao theo giờ Việt Nam, không theo múi giờ máy chủ", () => {
      // 15:00Z = 22:00 giờ Việt Nam
      const reminders = evaluateOrderReminders(sampleInput, schedule, new Date("2026-10-12T15:30:00.000Z"))
      const m1 = reminders.find((r) => r.milestone === "M1")
      expect(m1?.messageTemplate).toContain("22:00")
    })

    it("không kích hoạt mốc nào khi chưa đến giờ scheduledAt", () => {
      const currentTime = new Date("2026-10-12T12:05:00.000Z") // trước M0 (12:10)
      const reminders = evaluateOrderReminders(sampleInput, schedule, currentTime)
      expect(reminders).toHaveLength(0)
    })

    it("kích hoạt M0 khi đã đến giờ và tính độ trễ", () => {
      const currentTime = new Date("2026-10-12T12:20:00.000Z") // quá M0 10 phút
      const reminders = evaluateOrderReminders(sampleInput, schedule, currentTime)

      expect(reminders).toHaveLength(1)
      const r = reminders[0]
      expect(r).toBeDefined()
      if (!r) return

      expect(r.milestone).toBe("M0")
      expect(r.isOverdue).toBe(true)
      expect(r.overdueMinutes).toBe(10)
      expect(r.urgency).toBe("WARNING")
      expect(r.messageTemplate).toContain("FL-100")
      expect(r.messageTemplate).toContain("in Thẻ gia công")
    })

    it("chuyển sang mức CRITICAL khi quá hạn >= 15 phút", () => {
      const currentTime = new Date("2026-10-12T12:35:00.000Z") // quá M0 25 phút
      const reminders = evaluateOrderReminders(sampleInput, schedule, currentTime)

      const r = reminders[0]
      expect(r).toBeDefined()
      if (!r) return

      expect(r.urgency).toBe("CRITICAL")
      expect(r.overdueMinutes).toBe(25)
    })

    it("bỏ qua mốc đã được xác nhận hoàn tất (ACKNOWLEDGED)", () => {
      const currentTime = new Date("2026-10-12T12:20:00.000Z")
      const inputWithAck: OrderReminderCalculationInput = {
        ...sampleInput,
        metadataReminders: {
          M0: { status: "ACKNOWLEDGED", acknowledgedAt: "2026-10-12T12:15:00.000Z" },
        },
      }

      const reminders = evaluateOrderReminders(inputWithAck, schedule, currentTime)
      expect(reminders).toHaveLength(0)
    })

    it("tạm ẩn mốc đang trong thời gian hẹn lại (SNOOZED)", () => {
      const currentTime = new Date("2026-10-12T12:20:00.000Z")
      const inputWithSnooze: OrderReminderCalculationInput = {
        ...sampleInput,
        metadataReminders: {
          M0: {
            status: "SNOOZED",
            snoozedUntil: "2026-10-12T12:30:00.000Z", // hẹn lại đến 12:30
          },
        },
      }

      // Lúc 12:20: vẫn bị ẩn
      const remindersEarly = evaluateOrderReminders(inputWithSnooze, schedule, currentTime)
      expect(remindersEarly).toHaveLength(0)

      // Lúc 12:35: đã quá giờ hẹn lại -> hiện lại
      const remindersAfter = evaluateOrderReminders(
        inputWithSnooze,
        schedule,
        new Date("2026-10-12T12:35:00.000Z")
      )
      expect(remindersAfter.some((r) => r.milestone === "M0")).toBe(true)
    })

    it("kích hoạt M4 với thông tin shipper và SĐT điều phối đầy đủ", () => {
      const currentTime = new Date("2026-10-12T14:20:00.000Z")
      const reminders = evaluateOrderReminders(sampleInput, schedule, currentTime)

      const m4 = reminders.find((r) => r.milestone === "M4")
      expect(m4).toBeDefined()
      expect(m4?.recipientType).toBe("SHIPPER")
      expect(m4?.recipientTarget).toBe("0912345678")
      expect(m4?.messageTemplate).toContain("Bác Hùng")
      expect(m4?.messageTemplate).toContain("0987654321") // SĐT điều phối
    })
  })
})
