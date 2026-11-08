/**
 * Ngày lịch theo giờ Việt Nam (UTC+7, không có giờ mùa hè). Máy chủ không đặt `TZ`, nên `getDate()`/`setHours()`
 * theo giờ máy (UTC) làm đơn tạo 00:00–07:00 giờ VN mang ngày hôm trước (audit BL-10).
 */

const VN_OFFSET_MS = 7 * 3_600_000
const DAY_MS = 86_400_000

/** Năm/tháng/ngày theo giờ Việt Nam của thời điểm `at`. */
export function vnCalendarDate(at: Date = new Date()): { year: number; month: number; day: number } {
  const vn = new Date(at.getTime() + VN_OFFSET_MS)
  return { year: vn.getUTCFullYear(), month: vn.getUTCMonth() + 1, day: vn.getUTCDate() }
}

/** Nửa khoảng `[start, end)` (thời điểm thật) của ngày Việt Nam chứa `at`. */
export function vnDayBounds(at: Date = new Date()): { start: Date; end: Date } {
  const { year, month, day } = vnCalendarDate(at)
  const start = new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}

/** Hôm nay theo giờ Việt Nam, dạng `YYYY-MM-DD`. */
export function vnTodayIso(at: Date = new Date()): string {
  const { year, month, day } = vnCalendarDate(at)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}
