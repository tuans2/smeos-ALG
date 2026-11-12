/**
 * Đọc khung giờ giao (giờ Việt Nam) — một hàm cho mọi nơi tính hạn giao (audit BL-24, 11/11/2026). Trước đây ba bộ
 * phân tích riêng chỉ hiểu dạng `HH:MM - HH:MM`; `"14h-16h"`, `"Trước 12h"` hay chữ tự do đều rơi về 10:00 sáng, nên
 * đơn giao 15:00 bị tính "trễ 300 phút" và chi nhánh bị trừ phí gia công oan. Thuần.
 */

const TIME = String.raw`(\d{1,2})(?:\s*[:hH]\s*(\d{2})?)?`
const RANGE = new RegExp(`${TIME}\\s*(?:-|–|—|đến|tới)\\s*${TIME}`, "i")
/** Một mốc giờ phải có dấu `:` hoặc chữ `h` — tránh nhận nhầm số bất kỳ trong ghi chú. */
const SINGLE = /(\d{1,2})\s*(?::\s*(\d{2})|[hH]\s*(\d{2})?)/

function minutesOf(hour: string | undefined, minute: string | undefined): number | null {
  if (hour === undefined) return null
  const h = Number.parseInt(hour, 10)
  const m = minute === undefined ? 0 : Number.parseInt(minute, 10)
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 24 || m < 0 || m > 59 || (h === 24 && m > 0)) return null
  return h * 60 + m
}

/** Giờ kết thúc khung giao (phút tính từ 0:00) — khoảng thì lấy giờ cuối; chuỗi không nêu giờ → `null`. */
export function slotEndMinutes(slot: string | null | undefined): number | null {
  if (!slot) return null
  const range = RANGE.exec(slot)
  if (range && minutesOf(range[1], range[2]) !== null) return minutesOf(range[3], range[4])
  const single = SINGLE.exec(slot)
  if (single) return minutesOf(single[1], single[2] ?? single[3])
  return null
}

/** Mốc hạn giao (ms, theo giờ Việt Nam) hoặc `null` khi thiếu ngày hay khung giờ không nêu giờ. */
export function deliveryDeadlineMs(date: string | null | undefined, slot: string | null | undefined): number | null {
  const minutes = slotEndMinutes(slot)
  return minutes === null ? null : dayStartMs(date, minutes)
}

/** 0:00 giờ Việt Nam của ngày `YYYY-MM-DD…` cộng `minutes`; ngày sai → `null`. */
export function dayStartMs(date: string | null | undefined, minutes: number): number | null {
  if (!date) return null
  const day = date.trim().split("T")[0]
  const start = new Date(`${day}T00:00:00+07:00`).getTime()
  return Number.isNaN(start) ? null : start + minutes * 60_000
}
