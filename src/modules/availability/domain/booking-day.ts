import { unprocessable } from "@/core/http/errors"

/**
 * Ngày đặt chỗ: code dùng chuỗi `YYYY-MM-DD`, CSDL lưu cột `DATE` (rà soát M5, 22/10/2026).
 * Prisma đọc/ghi `DATE` dưới dạng `Date` lúc 00:00 UTC, nên chỉ đổi ở biên repository.
 */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Chuỗi ngày có thật trên lịch không (`2026-02-30` là sai, dù đúng định dạng). */
export function isValidIsoDay(value: string): boolean {
  const m = ISO_DAY.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toISOString().slice(0, 10) === value
}

/** `YYYY-MM-DD` → `Date` cho cột `DATE`. Ngày sai → 422, không để CSDL ném lỗi 500. */
export function isoDayToDate(value: string): Date {
  if (!isValidIsoDay(value)) throw unprocessable("Định dạng ngày không hợp lệ (YYYY-MM-DD).")
  return new Date(`${value}T00:00:00.000Z`)
}

export function dateToIsoDay(value: Date): string {
  return value.toISOString().slice(0, 10)
}
