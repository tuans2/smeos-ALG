/**
 * Kỳ báo cáo (Đợt 5 — checklist ALG 6.1–6.6) — luật thuần, giờ Việt Nam (UTC+7).
 * `from`/`to` dạng YYYY-MM-DD (bao gồm cả hai đầu); mặc định 30 ngày gần nhất; tối đa 366 ngày.
 * `granularity`: nhóm theo ngày, tuần (bắt đầu thứ Hai) hoặc tháng.
 */

export type Granularity = "day" | "week" | "month"
export interface ReportPeriod { from: string; to: string; start: Date; end: Date; granularity: Granularity }

const DAY_MS = 86_400_000
const VN_OFFSET_MS = 7 * 3_600_000
const DATE = /^\d{4}-\d{2}-\d{2}$/
export const MAX_PERIOD_DAYS = 366

export function vnDate(d: Date): string {
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)
}

const startOf = (date: string) => new Date(`${date}T00:00:00+07:00`)

export function parsePeriod(raw: { from?: string | null; to?: string | null; granularity?: string | null }, now: Date = new Date()): ReportPeriod | null {
  const to = raw.to && DATE.test(raw.to) ? raw.to : vnDate(now)
  const from = raw.from && DATE.test(raw.from) ? raw.from : vnDate(new Date(startOf(to).getTime() - 29 * DAY_MS))
  const start = startOf(from)
  const end = new Date(startOf(to).getTime() + DAY_MS)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null
  if ((end.getTime() - start.getTime()) / DAY_MS > MAX_PERIOD_DAYS) return null
  const g = raw.granularity === "week" || raw.granularity === "month" ? raw.granularity : "day"
  return { from, to, start, end, granularity: g }
}

/** Khoá nhóm của một thời điểm: YYYY-MM-DD (ngày, hoặc thứ Hai đầu tuần) hoặc YYYY-MM. */
export function bucketOf(at: Date, g: Granularity): string {
  const d = vnDate(at)
  if (g === "month") return d.slice(0, 7)
  if (g === "day") return d
  const day = new Date(`${d}T00:00:00Z`)
  const shift = (day.getUTCDay() + 6) % 7 // thứ Hai = 0
  return new Date(day.getTime() - shift * DAY_MS).toISOString().slice(0, 10)
}

/** Mọi khoá nhóm trong kỳ, theo thứ tự — để biểu đồ không thiếu ngày trống. */
export function bucketsOf(p: ReportPeriod): string[] {
  const out: string[] = []
  for (let t = p.start.getTime(); t < p.end.getTime(); t += DAY_MS) {
    const b = bucketOf(new Date(t), p.granularity)
    if (out.at(-1) !== b) out.push(b)
  }
  return out
}

/**
 * Hạn giao của đơn: giờ hẹn của Điều phối; không có thì cuối khung giờ đã hẹn ("08:00 - 10:00" → 10:00)
 * hoặc cuối ngày giao; không có ngày giao → null (không xét trễ).
 */
export function deliveryDeadline(window: unknown, estimatedAt: Date | null): Date | null {
  if (estimatedAt) return estimatedAt
  const w = window && typeof window === "object" ? (window as Record<string, unknown>) : {}
  if (typeof w.targetAt === "string" && !Number.isNaN(Date.parse(w.targetAt))) return new Date(w.targetAt)
  if (typeof w.date !== "string" || !DATE.test(w.date)) return null
  const slot = typeof w.timeSlot === "string" ? w.timeSlot : ""
  const hours = [...slot.matchAll(/(\d{1,2})\s*[:h]\s*(\d{2})?/g)].map((m) => [Number(m[1]), Number(m[2] ?? 0)] as const)
  const last = hours.at(-1)
  if (last && last[0] >= 0 && last[0] <= 23) {
    return new Date(`${w.date}T${String(last[0]).padStart(2, "0")}:${String(last[1]).padStart(2, "0")}:00+07:00`)
  }
  return new Date(startOf(w.date).getTime() + DAY_MS)
}

export const ratio = (part: number, total: number): number | null => (total > 0 ? Math.round((part / total) * 1000) / 10 : null)
