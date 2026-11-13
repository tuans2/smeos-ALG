/**
 * Thử lại sự kiện tích hợp — có giới hạn (CLAUDE.md: mọi vòng lặp/retry phải bị chặn).
 * 6 lần: 30s → 2m → 10m → 30m → 2h → 6h, hết lượt → DEAD (hiện trên giao diện để xử lý tay).
 */

export const MAX_EVENT_ATTEMPTS = 6
const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000, 21_600_000] as const

export type EventOutcome =
  | { status: "DONE" }
  | { status: "FAILED"; nextRetryAt: Date }
  | { status: "DEAD" }

/** `attempts` là số lần đã thử, tính cả lần vừa thất bại. */
export function outcomeAfterFailure(attempts: number, now: Date): EventOutcome {
  if (attempts >= MAX_EVENT_ATTEMPTS) return { status: "DEAD" }
  const delay = BACKOFF_MS[Math.min(Math.max(0, attempts - 1), BACKOFF_MS.length - 1)] ?? 0
  return { status: "FAILED", nextRetryAt: new Date(now.getTime() + delay) }
}
