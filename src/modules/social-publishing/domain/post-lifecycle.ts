/**
 * Vòng đời một bài đăng tự động (Bước 4, PO 08/11/2026). Thu hoạch từ SocialFlow `m07/routes.py` +
 * `agents/publisher.py` (hạng ADAPTER — viết lại, không chép): ở đó "thử lại" chỉ đặt lại trạng thái, không giới hạn,
 * và đăng theo 2 khung giờ cứng. Ở đây: hàng đợi theo giờ hẹn, thử lại CÓ GIỚI HẠN với khoảng giãn dần (CLAUDE.md
 * luật 5), lỗi cần người xử lý (hết hạn kết nối, thiếu quyền, nội dung bị từ chối) dừng ngay để báo user.
 * Thuần — không import hạ tầng.
 */
import type { PublishFailureKind, SocialChannel } from "@/core/ports/publisher-provider"

export const SOCIAL_CHANNELS: readonly SocialChannel[] = ["facebook", "instagram", "zalo", "tiktok"]

export const POST_STATUSES = ["QUEUED", "PUBLISHING", "PUBLISHED", "FAILED", "CANCELED"] as const
export type PostStatus = (typeof POST_STATUSES)[number]

/** 5 lần: 1 phút → 5 phút → 15 phút → 1 giờ → hết lượt (FAILED, hiện cho user bấm thử lại). */
export const MAX_PUBLISH_ATTEMPTS = 5
const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000] as const

/** Bài đang "PUBLISHING" quá lâu (tiến trình chết giữa chừng) → coi như một lần thử hỏng. */
export const STUCK_PUBLISHING_MS = 10 * 60_000

export function isSocialChannel(v: string): v is SocialChannel {
  return (SOCIAL_CHANNELS as readonly string[]).includes(v)
}

export type FailureOutcome =
  | { readonly status: "QUEUED"; readonly nextAttemptAt: Date }
  | { readonly status: "FAILED" }

/** `attempts` = số lần đã thử, tính cả lần vừa hỏng. */
export function outcomeAfterFailure(kind: PublishFailureKind, attempts: number, now: Date): FailureOutcome {
  if (kind === "NEEDS_ACTION" || attempts >= MAX_PUBLISH_ATTEMPTS) return { status: "FAILED" }
  const delay = BACKOFF_MS[Math.min(Math.max(0, attempts - 1), BACKOFF_MS.length - 1)] ?? BACKOFF_MS[0]
  return { status: "QUEUED", nextAttemptAt: new Date(now.getTime() + delay) }
}

/** Huỷ chỉ khi chưa bắt đầu đăng. */
export function canCancel(status: string): boolean {
  return status === "QUEUED"
}

/** Thử lại tay chỉ cho bài đã dừng vì lỗi — cấp lại đủ lượt thử. */
export function canRetry(status: string): boolean {
  return status === "FAILED"
}

export interface DueCandidate {
  readonly status: string
  readonly scheduledAt: Date
  readonly nextAttemptAt: Date | null
}

/** Đến lượt đăng: đang chờ và đã tới giờ hẹn (hoặc giờ thử lại). */
export function isDue(p: DueCandidate, now: Date): boolean {
  if (p.status !== "QUEUED") return false
  return (p.nextAttemptAt ?? p.scheduledAt).getTime() <= now.getTime()
}
