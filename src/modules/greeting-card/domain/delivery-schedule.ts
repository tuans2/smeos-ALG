/**
 * Khung giờ giao, giờ chốt đơn và thời gian chuẩn bị cho đơn Thẻ chào. Pure TypeScript.
 * Khung 2 tiếng + "Giờ cụ thể" (khách tự nhập HH:MM); Điều hành bật/tắt từng khung trong
 * cài đặt giao hàng (`brochure_shipping.delivery_slots`, `allow_custom_time`).
 * Khách không chọn được ngày/khung giờ mà tiệm không kịp giao hoặc đã tắt.
 */

import { DEFAULT_PREP_HOURS, type ShippingConfig } from "./brochure-pricing"

const VN_OFFSET_MS = 7 * 3_600_000

export interface DeliverySlot {
  id: string
  label: string
  startHour: number
  endHour: number
}

/** Khung 2 tiếng, theo thứ tự trong ngày. `id` là khoá lưu trong cài đặt — không đổi. */
export const DELIVERY_SLOTS: readonly DeliverySlot[] = [
  { id: "08-10", label: "08:00 - 10:00", startHour: 8, endHour: 10 },
  { id: "10-12", label: "10:00 - 12:00", startHour: 10, endHour: 12 },
  { id: "12-14", label: "12:00 - 14:00", startHour: 12, endHour: 14 },
  { id: "14-16", label: "14:00 - 16:00", startHour: 14, endHour: 16 },
  { id: "16-18", label: "16:00 - 18:00", startHour: 16, endHour: 18 },
  { id: "18-20", label: "18:00 - 20:00", startHour: 18, endHour: 20 },
  { id: "20-22", label: "20:00 - 22:00", startHour: 20, endHour: 22 },
]
export const DELIVERY_SLOT_IDS = DELIVERY_SLOTS.map((s) => s.id)

/** Giờ cụ thể khách nhập được lưu thành `Giờ cụ thể: HH:MM`. */
export const CUSTOM_TIME_PREFIX = "Giờ cụ thể: "
export const CUSTOM_TIME_MIN_HOUR = 7
export const CUSTOM_TIME_MAX_HOUR = 22

type Schedule = Pick<ShippingConfig, "sameDayCutoffHour" | "prepHours" | "slotIds" | "allowCustomTime">

/** Khung giờ tiệm đang bật (chưa cấu hình → bật tất cả). */
export function enabledSlots(cfg: Schedule): DeliverySlot[] {
  if (!cfg.slotIds) return [...DELIVERY_SLOTS]
  return DELIVERY_SLOTS.filter((s) => cfg.slotIds!.includes(s.id))
}

export function customTimeAllowed(cfg: Schedule): boolean {
  return cfg.allowCustomTime !== false
}

export function customTimeLabel(hhmm: string): string {
  return `${CUSTOM_TIME_PREFIX}${hhmm}`
}

/** Giờ (thập phân) của giá trị giờ cụ thể; `null` nếu không phải/không hợp lệ. */
export function parseCustomTime(slot: string): number | null {
  if (!isCustomTimeSlot(slot)) return null
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(slot.trim().slice(CUSTOM_TIME_PREFIX.trim().length).trim())
  if (!m) return null
  const hour = Number(m[1]) + Number(m[2]) / 60
  return hour >= CUSTOM_TIME_MIN_HOUR && hour <= CUSTOM_TIME_MAX_HOUR ? hour : null
}

export function isCustomTimeSlot(slot: string | undefined | null): boolean {
  return Boolean(slot?.trim().startsWith(CUSTOM_TIME_PREFIX.trim()))
}

/** Làm tròn tiến lên mốc 30 phút gần nhất (vd: 13.0 -> 13.0; 13.5833 (13:35) -> 14.0 (14:00); 13.25 -> 13.5 (13:30)). */
export function roundUpTo30Minutes(hour: number): number {
  const minutes = Math.round(hour * 60)
  const roundedMinutes = Math.ceil(minutes / 30) * 30
  return roundedMinutes / 60
}

/** Định dạng nhãn khung 2 tiếng từ startHour và endHour (vd: 13, 15 -> "13:00 - 15:00"). */
export function formatSlotLabel(startHour: number, endHour: number): string {
  const startH = Math.floor(startHour)
  const startM = Math.round((startHour % 1) * 60)
  const endH = Math.floor(endHour)
  const endM = Math.round((endHour % 1) * 60)
  return `${pad(startH)}:${pad(startM)} - ${pad(endH)}:${pad(endM)}`
}

/** Tách giờ bắt đầu từ nhãn khung "HH:MM - HH:MM"; null nếu không hợp lệ. */
export function parseSlotStartHour(slot: string): number | null {
  const m = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(slot.trim())
  if (!m) return null
  return Number(m[1]) + Number(m[2]) / 60
}

function vnClock(now: Date): { date: string; hour: number } {
  const vn = new Date(now.getTime() + VN_OFFSET_MS)
  return { date: vn.toISOString().slice(0, 10), hour: vn.getUTCHours() + vn.getUTCMinutes() / 60 }
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Giờ sớm nhất còn kịp giao trong ngày `date`; `null` = hôm nay đã qua giờ chốt; 0 = ngày tương lai. */
export function readyHour(date: string, cfg: Schedule, now: Date = new Date()): number | null {
  const { date: today, hour } = vnClock(now)
  if (date !== today) return 0
  if (cfg.sameDayCutoffHour != null && hour >= cfg.sameDayCutoffHour) return null
  const prep = cfg.prepHours ?? DEFAULT_PREP_HOURS
  return hour + prep
}

/**
 * Nhãn khung 2 tiếng còn chọn được cho ngày `date`:
 * - Ngày tương lai: toàn bộ khung tiệm đang bật.
 * - Hôm nay: chỉ hiển thị các ca chuẩn có giờ bắt đầu (startHour) cách thời điểm
 *   hiện tại ít nhất bằng thời gian chuẩn bị (lead time / prepHours, mặc định 2h).
 *   Không chèn ca lẻ gây chồng chéo khung giờ.
 */
export function availableSlots(date: string, cfg: Schedule, now: Date = new Date()): string[] {
  const ready = readyHour(date, cfg, now)
  if (ready === null) return []
  const enabled = enabledSlots(cfg)
  if (enabled.length === 0) return []

  const { date: today } = vnClock(now)
  if (date !== today) {
    return enabled.map((s) => s.label)
  }

  // Hôm nay: chỉ hiển thị các ca chuẩn có startHour >= ready (đảm bảo thợ có ít nhất prepHours chuẩn bị)
  return enabled.filter((s) => s.startHour >= ready).map((s) => s.label)
}

/** Còn hẹn giờ cụ thể được trong ngày `date` không. */
export function customTimeAvailable(date: string, cfg: Schedule, now: Date = new Date()): boolean {
  const ready = readyHour(date, cfg, now)
  return customTimeAllowed(cfg) && ready !== null && ready <= CUSTOM_TIME_MAX_HOUR
}

/** Ngày sớm nhất còn giao được: hôm nay, hoặc ngày mai khi hôm nay hết khung giờ. */
export function earliestDeliveryDate(cfg: Schedule, now: Date = new Date()): string {
  const { date: today } = vnClock(now)
  const ok = availableSlots(today, cfg, now).length > 0 || customTimeAvailable(today, cfg, now)
  return ok ? today : nextDay(today)
}

const VI_WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]

/** "Thứ Sáu, 16/10/2026" từ "2026-10-16" — ô chọn ngày của trình duyệt hiện theo ngôn ngữ máy khách. */
export function viDeliveryDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  const weekday = VI_WEEKDAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()]
  return `${weekday}, ${d}/${mo}/${y}`
}

/** "16/10/2026" từ "2026-10-16" — bản gọn cho ô lọc/ô nhỏ phía nhân viên. */
export function viShortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** Lỗi tiếng Việt khi ngày/khung giờ khách chọn không hợp lệ hoặc không kịp giao; `null` nếu hợp lệ. */
export function deliveryScheduleError(
  date: string,
  slot: string | undefined,
  cfg: Schedule,
  now: Date = new Date(),
): string | null {
  const earliest = earliestDeliveryDate(cfg, now)
  if (date < earliest) {
    return cfg.sameDayCutoffHour != null
      ? `Đã qua giờ nhận đơn giao trong ngày (${cfg.sameDayCutoffHour}h). Vui lòng chọn từ ngày mai.`
      : "Hôm nay cửa hàng không còn kịp giao. Vui lòng chọn từ ngày mai."
  }
  const value = slot?.trim()
  if (!value) return null

  if (isCustomTimeSlot(value)) {
    if (!customTimeAllowed(cfg)) return "Cửa hàng chưa nhận hẹn giờ cụ thể. Vui lòng chọn một khung giờ."
    const hour = parseCustomTime(value)
    if (hour === null) {
      return `Vui lòng nhập giờ cụ thể dạng HH:MM, từ ${pad(CUSTOM_TIME_MIN_HOUR)}:00 đến ${pad(CUSTOM_TIME_MAX_HOUR)}:00.`
    }
    const ready = readyHour(date, cfg, now)
    if (ready === null || hour < ready) return "Khung giờ này cửa hàng không còn kịp chuẩn bị. Vui lòng chọn giờ muộn hơn."
    return null
  }

  const available = availableSlots(date, cfg, now)
  if (available.includes(value)) {
    return null
  }

  const enabled = enabledSlots(cfg)
  if (enabled.some((s) => s.label === value)) {
    return "Khung giờ này cửa hàng không còn kịp chuẩn bị. Vui lòng chọn khung giờ muộn hơn."
  }
  const parsedStart = parseSlotStartHour(value)
  if (parsedStart !== null) {
    const ready = readyHour(date, cfg, now)
    if (ready !== null && parsedStart < ready) {
      return "Khung giờ này cửa hàng không còn kịp chuẩn bị. Vui lòng chọn khung giờ muộn hơn."
    }
  }
  return "Khung giờ này cửa hàng không nhận giao. Vui lòng chọn khung giờ khác."
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}
