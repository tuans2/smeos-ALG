/**
 * Giờ đăng (Bước 4, PO 08/11/2026): "Đăng ngay" hoặc "Tự lên lịch" — hệ thống chọn khung giờ khách hay lướt mạng
 * (giờ Việt Nam) và giãn các bài cách nhau, để user không phải tự chọn giờ. Thay 2 khung giờ cứng 11h/23h của
 * SocialFlow. Thuần — không import hạ tầng.
 */

/** Giờ Việt Nam UTC+7, không đổi giờ theo mùa. */
const VN_OFFSET_MS = 7 * 3_600_000

/** Khung giờ vàng (giờ:phút VN): trưa nghỉ và tối sau giờ làm. */
export const GOLDEN_SLOTS: ReadonlyArray<readonly [number, number]> = [[11, 30], [20, 0]]

/** Ít nhất 15 phút sau thời điểm bấm — kịp sửa / huỷ. */
export const MIN_LEAD_MS = 15 * 60_000
/** Các bài của cùng một lần lên lịch cách nhau 10 phút. */
export const SPACING_MS = 10 * 60_000
/** Không hẹn xa quá 60 ngày (kết nối có thể hết hạn trước đó). */
export const MAX_AHEAD_MS = 60 * 24 * 3_600_000

/** Khung giờ vàng gần nhất cách `now` ít nhất `MIN_LEAD_MS`. */
export function nextGoldenSlot(now: Date): Date {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS)
  for (let day = 0; day < 3; day++) {
    for (const [h, m] of GOLDEN_SLOTS) {
      const vn = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + day, h, m)
      const utc = vn - VN_OFFSET_MS
      if (utc - now.getTime() >= MIN_LEAD_MS) return new Date(utc)
    }
  }
  return new Date(now.getTime() + MIN_LEAD_MS)
}

export type ScheduleMode = { readonly kind: "NOW" } | { readonly kind: "AUTO" } | { readonly kind: "AT"; readonly at: Date }

/** Giờ đăng cho `count` bài theo chế độ đã chọn; `null` + lý do khi giờ user chọn không hợp lệ. */
export function planTimes(mode: ScheduleMode, count: number, now: Date): { times: Date[] } | { error: string } {
  let start: Date
  if (mode.kind === "NOW") start = now
  else if (mode.kind === "AUTO") start = nextGoldenSlot(now)
  else {
    if (mode.at.getTime() < now.getTime() - 60_000) return { error: "Giờ hẹn đã qua — chọn giờ khác" }
    if (mode.at.getTime() - now.getTime() > MAX_AHEAD_MS) return { error: "Chỉ hẹn trong vòng 60 ngày tới" }
    start = mode.at
  }
  // Đăng ngay: tất cả cùng lúc (mỗi kênh một bài); hẹn giờ: giãn cách để không dồn một phút
  const gap = mode.kind === "NOW" ? 0 : SPACING_MS
  return { times: Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * gap)) }
}
