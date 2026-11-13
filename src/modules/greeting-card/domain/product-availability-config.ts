/**
 * product-availability-config.ts — Domain model kiểm tra khả dụng sản phẩm đa ngành.
 *
 * Mỗi ngành có cơ chế "hết hàng / không khả dụng" khác nhau về bản chất:
 *   FLORAL / RETAIL_GENERAL → STOCK_QUANTITY   (bật/tắt thủ công hoặc tồn kho)
 *   CRAFT_GIFT              → DAILY_CAPACITY   (số đơn/ngày, thủ công cần lead time)
 *   FNB / SERVICES          → SCHEDULE_SLOTS   (đặt bàn/lịch theo khung giờ)
 *   HOMESTAY                → BOOKING_CALENDAR (calendar, block ngày đã đặt)
 *
 * Pure TypeScript — không import Prisma.
 */

// ─── Mode ─────────────────────────────────────────────────────────────────────

export type AvailabilityMode =
  | "STOCK_QUANTITY"    // Hoa, Bán lẻ, Thủ công, Thời trang
  | "DAILY_CAPACITY"   // Thủ công, F&B — số đơn/ngày
  | "BOOKING_CALENDAR" // Homestay — calendar ngày check-in/check-out
  | "SCHEDULE_SLOTS"   // Dịch vụ, F&B — khung giờ theo lịch

// ─── Config shapes per mode ────────────────────────────────────────────────────

/** Ngày không nhận đơn "YYYY-MM-DD" (hết nguyên liệu, nghỉ, bảo trì) — áp cho mọi chế độ (checklist ALG 2.8). */
interface BlockableDates {
  manualBlockedDates?: string[]
}

export interface StockQuantityConfig extends BlockableDates {
  mode: "STOCK_QUANTITY"
  /** null = không giới hạn (tiệm bật/tắt thủ công qua product_inventory). */
  maxQuantity: number | null
}

export interface DailyCapacityConfig extends BlockableDates {
  mode: "DAILY_CAPACITY"
  maxOrdersPerDay: number
  closedWeekdays: number[] // 0=CN, 1=T2, ..., 6=T7
}

export interface BookingCalendarConfig extends BlockableDates {
  mode: "BOOKING_CALENDAR"
  minNights: number
  maxNights: number // 0 = không giới hạn
  leadDays: number  // ngày đặt trước tối thiểu
}

export interface ScheduleSlotsConfig extends BlockableDates {
  mode: "SCHEDULE_SLOTS"
  slots: Array<{
    id: string
    label: string
    maxPerSlot: number
    weekdays?: number[]
  }>
  bookingLeadDays: number
}

export type AvailabilityConfig =
  | StockQuantityConfig
  | DailyCapacityConfig
  | BookingCalendarConfig
  | ScheduleSlotsConfig

// ─── Defaults per industry (nghiên cứu thực tế) ───────────────────────────────

export function defaultModeForIndustry(industryKey?: string | null): AvailabilityMode {
  switch (industryKey) {
    case "HOMESTAY":   return "BOOKING_CALENDAR"
    case "FNB":        return "SCHEDULE_SLOTS"
    case "SERVICES":   return "SCHEDULE_SLOTS"
    case "CRAFT_GIFT": return "DAILY_CAPACITY"
    default:           return "STOCK_QUANTITY"
  }
}

export function defaultConfigForIndustry(industryKey?: string | null): AvailabilityConfig {
  const mode = defaultModeForIndustry(industryKey)
  switch (mode) {
    case "BOOKING_CALENDAR":
      return { mode, minNights: 1, maxNights: 0, leadDays: 1 }
    case "SCHEDULE_SLOTS":
      return {
        mode,
        bookingLeadDays: 1,
        slots: industryKey === "FNB"
          ? [
              { id: "lunch",  label: "Bữa trưa 11:00–13:30", maxPerSlot: 10 },
              { id: "dinner", label: "Bữa tối 17:30–21:00",  maxPerSlot: 15 },
            ]
          : [
              { id: "morning",   label: "Buổi sáng 8:00–12:00",  maxPerSlot: 3 },
              { id: "afternoon", label: "Buổi chiều 13:00–17:00", maxPerSlot: 3 },
            ],
      }
    case "DAILY_CAPACITY":
      return { mode, maxOrdersPerDay: 5, closedWeekdays: [] }
    default:
      return { mode: "STOCK_QUANTITY", maxQuantity: null }
  }
}

// ─── Parser ────────────────────────────────────────────────────────────────────

export function parseAvailabilityConfig(
  raw: unknown,
  industryKey?: string | null,
): AvailabilityConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultConfigForIndustry(industryKey)
  }
  const blocked = parseDateArray((raw as Record<string, unknown>).manualBlockedDates)
  const parsed = parseModeConfig(raw as Record<string, unknown>, industryKey)
  return blocked.length > 0 ? { ...parsed, manualBlockedDates: blocked } : parsed
}

function parseModeConfig(obj: Record<string, unknown>, industryKey?: string | null): AvailabilityConfig {
  const mode = obj.mode as AvailabilityMode | undefined

  switch (mode) {
    case "BOOKING_CALENDAR":
      return {
        mode,
        minNights: safeInt(obj.minNights, 1),
        maxNights: safeInt(obj.maxNights, 0),
        leadDays:  safeInt(obj.leadDays, 1),
      }
    case "DAILY_CAPACITY":
      return {
        mode,
        maxOrdersPerDay: safeInt(obj.maxOrdersPerDay, 5),
        closedWeekdays:  parseWeekdays(obj.closedWeekdays),
      }
    case "SCHEDULE_SLOTS": {
      const rawSlots = Array.isArray(obj.slots) ? obj.slots : []
      const slots = rawSlots
        .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
        .map((s) => ({
          id:         String(s.id ?? ""),
          label:      String(s.label ?? ""),
          maxPerSlot: safeInt(s.maxPerSlot, 1),
          weekdays:   parseWeekdays(s.weekdays),
        }))
        .filter((s) => s.id && s.label)
      return { mode, slots, bookingLeadDays: safeInt(obj.bookingLeadDays, 1) }
    }
    case "STOCK_QUANTITY":
      return {
        mode,
        maxQuantity: typeof obj.maxQuantity === "number" && obj.maxQuantity >= 0
          ? obj.maxQuantity : null,
      }
    default:
      return defaultConfigForIndustry(industryKey)
  }
}

// ─── Pure check helpers ────────────────────────────────────────────────────────

export interface BookingSpan {
  checkInDate: string
  checkOutDate: string
}

export function hasCalendarConflict(
  newSpan: BookingSpan,
  existing: readonly BookingSpan[],
): boolean {
  return existing.some(
    (b) => newSpan.checkInDate < b.checkOutDate && newSpan.checkOutDate > b.checkInDate
  )
}

export function countNights(checkInDate: string, checkOutDate: string): number {
  const inMs  = Date.parse(`${checkInDate}T00:00:00Z`)
  const outMs = Date.parse(`${checkOutDate}T00:00:00Z`)
  if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return 0
  return Math.round((outMs - inMs) / 86_400_000)
}

export function validateNights(nights: number, cfg: BookingCalendarConfig): string | null {
  if (nights < cfg.minNights) return `Tối thiểu ${cfg.minNights} đêm`
  if (cfg.maxNights > 0 && nights > cfg.maxNights) return `Tối đa ${cfg.maxNights} đêm`
  return null
}

export function isManuallyBlocked(date: string, cfg: BlockableDates): boolean {
  return (cfg.manualBlockedDates ?? []).includes(date)
}

// ─── Private utils ─────────────────────────────────────────────────────────────

function safeInt(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback
}

function parseWeekdays(v: unknown): number[] {
  if (!Array.isArray(v)) return []
  return v.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
}

function parseDateArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
}
