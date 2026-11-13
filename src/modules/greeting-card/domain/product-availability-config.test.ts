import { describe, expect, it } from "vitest"
import {
  defaultModeForIndustry,
  defaultConfigForIndustry,
  parseAvailabilityConfig,
  hasCalendarConflict,
  countNights,
  validateNights,
  isManuallyBlocked,
  type BookingCalendarConfig,
  type DailyCapacityConfig,
  type ScheduleSlotsConfig,
} from "./product-availability-config"

describe("product-availability-config domain", () => {
  describe("defaultModeForIndustry", () => {
    it("returns BOOKING_CALENDAR for HOMESTAY", () => {
      expect(defaultModeForIndustry("HOMESTAY")).toBe("BOOKING_CALENDAR")
    })

    it("returns SCHEDULE_SLOTS for FNB and SERVICES", () => {
      expect(defaultModeForIndustry("FNB")).toBe("SCHEDULE_SLOTS")
      expect(defaultModeForIndustry("SERVICES")).toBe("SCHEDULE_SLOTS")
    })

    it("returns DAILY_CAPACITY for CRAFT_GIFT", () => {
      expect(defaultModeForIndustry("CRAFT_GIFT")).toBe("DAILY_CAPACITY")
    })

    it("returns STOCK_QUANTITY for FLORAL, RETAIL_GENERAL, FASHION and null", () => {
      expect(defaultModeForIndustry("FLORAL")).toBe("STOCK_QUANTITY")
      expect(defaultModeForIndustry("RETAIL_GENERAL")).toBe("STOCK_QUANTITY")
      expect(defaultModeForIndustry("FASHION")).toBe("STOCK_QUANTITY")
      expect(defaultModeForIndustry(null)).toBe("STOCK_QUANTITY")
    })
  })

  describe("defaultConfigForIndustry", () => {
    it("provides reasonable defaults for HOMESTAY", () => {
      const cfg = defaultConfigForIndustry("HOMESTAY") as BookingCalendarConfig
      expect(cfg.mode).toBe("BOOKING_CALENDAR")
      expect(cfg.minNights).toBe(1)
      expect(cfg.leadDays).toBe(1)
    })

    it("provides lunch/dinner slots for FNB", () => {
      const cfg = defaultConfigForIndustry("FNB") as ScheduleSlotsConfig
      expect(cfg.mode).toBe("SCHEDULE_SLOTS")
      expect(cfg.slots.map((s) => s.id)).toEqual(["lunch", "dinner"])
    })

    it("provides morning/afternoon slots for SERVICES", () => {
      const cfg = defaultConfigForIndustry("SERVICES") as ScheduleSlotsConfig
      expect(cfg.mode).toBe("SCHEDULE_SLOTS")
      expect(cfg.slots.map((s) => s.id)).toEqual(["morning", "afternoon"])
    })

    it("provides daily capacity for CRAFT_GIFT", () => {
      const cfg = defaultConfigForIndustry("CRAFT_GIFT") as DailyCapacityConfig
      expect(cfg.mode).toBe("DAILY_CAPACITY")
      expect(cfg.maxOrdersPerDay).toBe(5)
    })
  })

  describe("parseAvailabilityConfig", () => {
    it("falls back to industry default on null or non-object input", () => {
      const cfg = parseAvailabilityConfig(null, "HOMESTAY")
      expect(cfg.mode).toBe("BOOKING_CALENDAR")
    })

    it("parses valid BOOKING_CALENDAR config and filters manual blocked dates", () => {
      const raw = {
        mode: "BOOKING_CALENDAR",
        minNights: 2,
        maxNights: 14,
        leadDays: 3,
        manualBlockedDates: ["2026-12-24", "2026-12-25", "invalid-date"],
      }
      const parsed = parseAvailabilityConfig(raw, "HOMESTAY") as BookingCalendarConfig
      expect(parsed.mode).toBe("BOOKING_CALENDAR")
      expect(parsed.minNights).toBe(2)
      expect(parsed.maxNights).toBe(14)
      expect(parsed.leadDays).toBe(3)
      expect(parsed.manualBlockedDates).toEqual(["2026-12-24", "2026-12-25"])
    })

    it("parses valid DAILY_CAPACITY config", () => {
      const raw = {
        mode: "DAILY_CAPACITY",
        maxOrdersPerDay: 8,
        closedWeekdays: [0, 6], // Chủ nhật & Thứ 7
      }
      const parsed = parseAvailabilityConfig(raw) as DailyCapacityConfig
      expect(parsed.mode).toBe("DAILY_CAPACITY")
      expect(parsed.maxOrdersPerDay).toBe(8)
      expect(parsed.closedWeekdays).toEqual([0, 6])
    })
  })

  describe("hasCalendarConflict", () => {
    const existing = [
      { checkInDate: "2026-10-20", checkOutDate: "2026-10-23" },
      { checkInDate: "2026-10-25", checkOutDate: "2026-10-28" },
    ]

    it("returns true when new span overlaps partially or fully", () => {
      // Overlap inside
      expect(hasCalendarConflict({ checkInDate: "2026-10-21", checkOutDate: "2026-10-22" }, existing)).toBe(true)
      // Overlap start
      expect(hasCalendarConflict({ checkInDate: "2026-10-19", checkOutDate: "2026-10-21" }, existing)).toBe(true)
      // Overlap end
      expect(hasCalendarConflict({ checkInDate: "2026-10-22", checkOutDate: "2026-10-24" }, existing)).toBe(true)
      // Exact same dates
      expect(hasCalendarConflict({ checkInDate: "2026-10-20", checkOutDate: "2026-10-23" }, existing)).toBe(true)
    })

    it("returns false when new span touches checkIn on checkOut (back-to-back booking)", () => {
      // Check in on previous guest's checkout day: 2026-10-23 is free because guest checks out morning
      expect(hasCalendarConflict({ checkInDate: "2026-10-23", checkOutDate: "2026-10-25" }, existing)).toBe(false)
      // Check out on next guest's checkin day
      expect(hasCalendarConflict({ checkInDate: "2026-10-18", checkOutDate: "2026-10-20" }, existing)).toBe(false)
    })

    it("returns false when completely disjoint", () => {
      expect(hasCalendarConflict({ checkInDate: "2026-11-01", checkOutDate: "2026-11-05" }, existing)).toBe(false)
    })
  })

  describe("countNights and validateNights", () => {
    it("calculates exact number of nights", () => {
      expect(countNights("2026-10-20", "2026-10-23")).toBe(3)
      expect(countNights("2026-10-20", "2026-10-20")).toBe(0)
      expect(countNights("2026-10-23", "2026-10-20")).toBe(0)
    })

    it("validates min and max nights correctly", () => {
      const cfg: BookingCalendarConfig = {
        mode: "BOOKING_CALENDAR",
        minNights: 2,
        maxNights: 7,
        leadDays: 1,
      }
      expect(validateNights(1, cfg)).toBe("Tối thiểu 2 đêm")
      expect(validateNights(2, cfg)).toBeNull()
      expect(validateNights(5, cfg)).toBeNull()
      expect(validateNights(8, cfg)).toBe("Tối đa 7 đêm")
    })
  })

  describe("isManuallyBlocked", () => {
    const cfg: BookingCalendarConfig = {
      mode: "BOOKING_CALENDAR",
      minNights: 1,
      maxNights: 0,
      leadDays: 1,
      manualBlockedDates: ["2026-12-31"],
    }

    it("detects blocked dates", () => {
      expect(isManuallyBlocked("2026-12-31", cfg)).toBe(true)
      expect(isManuallyBlocked("2026-12-30", cfg)).toBe(false)
    })
  })

  it("ngày chặn thủ công đọc được ở mọi chế độ, không chỉ lịch phòng (checklist ALG 2.8)", () => {
    const parsed = parseAvailabilityConfig({ mode: "STOCK_QUANTITY", maxQuantity: null, manualBlockedDates: ["2027-02-14", "sai"] })
    expect(parsed.manualBlockedDates).toEqual(["2027-02-14"])
    expect(isManuallyBlocked("2027-02-14", parsed)).toBe(true)
    expect(isManuallyBlocked("2027-02-15", parsed)).toBe(false)
  })
})
