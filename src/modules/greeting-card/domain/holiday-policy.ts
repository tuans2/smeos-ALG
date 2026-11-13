/**
 * Quy định ngày lễ cho đơn Thẻ chào (PO chốt 08/10/2026), nằm trong chính sách cửa hàng
 * (`organizations.settings.brochure_holidays`):
 * - Giờ chốt nhận đơn giao trong ngày riêng cho ngày lễ, và SỐ ĐƠN TỐI ĐA mỗi ngày lễ —
 *   áp cho CẢ TIỆM (năng lực xưởng/shipper), mặc định 500 đơn, Điều hành sửa được.
 * - Phụ phí ngày lễ — chỉ áp cho bộ sưu tập mà Điều hành bật "Áp dụng phụ phí ngày lễ"
 *   (`catalog.filters.appliedPolicies.applyHolidaySurcharge`).
 * Ngày lễ khai theo `MM-DD` (lặp hằng năm: 14/02, 08/03, 20/10…) hoặc `YYYY-MM-DD` (một lần: Tết âm lịch).
 * Pure TypeScript.
 */
import { parseShippingConfig, type ShippingConfig } from "./brochure-pricing"
import { deliveryScheduleError } from "./delivery-schedule"

export const HOLIDAY_SETTINGS_KEY = "brochure_holidays"
export const DEFAULT_HOLIDAY_MAX_ORDERS = 500
export const MAX_HOLIDAYS = 60
export const MAX_HOLIDAY_SURCHARGE_VND = 10_000_000
export const HOLIDAY_NAME_MAX = 60

export interface HolidayDay {
  id: string
  name: string
  /** `MM-DD` (hằng năm) hoặc `YYYY-MM-DD` (một ngày cụ thể) */
  date: string
  /** Giờ chốt nhận đơn giao trong ngày lễ (1–23, giờ VN); `null` = theo giờ chốt thường */
  cutoffHour: number | null
  maxOrders: number
  surchargeVnd: number
}

/** Gợi ý khi tiệm chưa khai — Điều hành bấm thêm, không tự áp. */
export const SUGGESTED_HOLIDAYS: ReadonlyArray<Pick<HolidayDay, "name" | "date">> = [
  { name: "Lễ Tình nhân (Valentine)", date: "02-14" },
  { name: "Quốc tế Phụ nữ 8/3", date: "03-08" },
  { name: "Phụ nữ Việt Nam 20/10", date: "10-20" },
  { name: "Nhà giáo Việt Nam 20/11", date: "11-20" },
  { name: "Giáng sinh", date: "12-24" },
]

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const FULL_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export function isHolidayDate(value: string): boolean {
  return MONTH_DAY.test(value) || FULL_DATE.test(value)
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null

/** Đọc danh sách ngày lễ; mục hỏng bị bỏ, trùng ngày giữ mục đầu. */
export function parseHolidayPolicy(settings: unknown): HolidayDay[] {
  const list = rec(rec(settings)[HOLIDAY_SETTINGS_KEY]).days
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: HolidayDay[] = []
  for (const raw of list) {
    const r = rec(raw)
    const date = typeof r.date === "string" ? r.date.trim() : ""
    const name = typeof r.name === "string" ? r.name.trim().slice(0, HOLIDAY_NAME_MAX) : ""
    if (!isHolidayDate(date) || !name || seen.has(date)) continue
    seen.add(date)
    out.push({
      id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : date,
      name,
      date,
      cutoffHour: int(r.cutoff_hour, 1, 23),
      maxOrders: int(r.max_orders, 1, 100_000) ?? DEFAULT_HOLIDAY_MAX_ORDERS,
      surchargeVnd: int(r.surcharge_vnd, 0, MAX_HOLIDAY_SURCHARGE_VND) ?? 0,
    })
    if (out.length >= MAX_HOLIDAYS) break
  }
  return out
}

/** Ngày lễ trùng ngày giao `YYYY-MM-DD` (ngày cụ thể ưu tiên hơn ngày lặp hằng năm), hoặc `null`. */
export function holidayOn(deliveryDate: string, days: readonly HolidayDay[]): HolidayDay | null {
  if (!FULL_DATE.test(deliveryDate)) return null
  return days.find((d) => d.date === deliveryDate) ?? days.find((d) => d.date === deliveryDate.slice(5)) ?? null
}

/** Cấu hình giờ giao cho đúng ngày: ngày lễ có giờ chốt riêng thì thay giờ chốt thường. */
export function scheduleForDate<T extends Pick<ShippingConfig, "sameDayCutoffHour">>(cfg: T, holiday: HolidayDay | null): T {
  return holiday?.cutoffHour != null ? { ...cfg, sameDayCutoffHour: holiday.cutoffHour } : cfg
}

/** Lỗi khi ngày lễ đã nhận đủ đơn (`orderCount` = số đơn chưa huỷ giao ngày đó), hoặc `null`. */
export function holidayCapacityError(holiday: HolidayDay | null, orderCount: number): string | null {
  if (!holiday || orderCount < holiday.maxOrders) return null
  return `Ngày ${holiday.name} cửa hàng đã nhận đủ đơn. Vui lòng chọn ngày giao khác hoặc liên hệ cửa hàng.`
}

/** Bộ sưu tập có bật phụ phí ngày lễ không (Điều hành chọn khi tạo/sửa bộ sưu tập). */
export function catalogAppliesHolidaySurcharge(catalogFilters: unknown): boolean {
  return rec(rec(catalogFilters).appliedPolicies).applyHolidaySurcharge === true
}

/** Phụ phí ngày lễ cho một đơn: chỉ khi ngày giao là ngày lễ có phụ phí VÀ bộ sưu tập bật áp dụng. */
export function holidaySurcharge(holiday: HolidayDay | null, catalogFilters: unknown): { vnd: number; name: string } | null {
  if (!holiday || holiday.surchargeVnd <= 0 || !catalogAppliesHolidaySurcharge(catalogFilters)) return null
  return { vnd: holiday.surchargeVnd, name: holiday.name }
}

/**
 * Các ngành dùng lịch đặt phòng hoặc khung giờ riêng (không phải giao hàng tận nơi)
 * không cần kiểm tra delivery time slot theo cơ chế của hoa tươi.
 * HOMESTAY → BOOKING_CALENDAR; FNB/SERVICES → SCHEDULE_SLOTS riêng.
 */
const INDUSTRIES_WITHOUT_DELIVERY_SLOT = new Set(["HOMESTAY", "FNB", "SERVICES"])

/**
 * Kiểm ngày/khung giờ giao theo cài đặt tiệm, có tính giờ chốt riêng của ngày lễ.
 * `null` = hợp lệ. Bỏ qua cho các ngành không dùng delivery time slot (HOMESTAY, FNB, SERVICES).
 */
export function orderScheduleError(
  date: string,
  slot: string | undefined,
  shopSettings: unknown,
  now: Date = new Date(),
  industryKey?: string | null,
): string | null {
  // Ngành không giao hàng tận nơi → không áp dụng kiểm tra khung giờ giao
  if (industryKey && INDUSTRIES_WITHOUT_DELIVERY_SLOT.has(industryKey)) return null
  const holiday = holidayOn(date.trim(), parseHolidayPolicy(shopSettings))
  return deliveryScheduleError(date, slot, scheduleForDate(parseShippingConfig(shopSettings), holiday), now)
}
