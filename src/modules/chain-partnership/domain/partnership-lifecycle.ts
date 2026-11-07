import type { PartnershipStatus } from "./partnership-entities"

/**
 * Vòng đời liên kết Chuỗi ↔ cửa hàng có sẵn (audit hành trình C1/C2, gói UJ-10 — UQ2: lời mời 7 ngày).
 *
 * Trước đây Chuỗi tạo liên kết `ACTIVE` ngay, cửa hàng không được hỏi, và trạng thái đổi qua lại tự do không lý
 * do. Nay: Chuỗi mời → `PENDING`; chỉ CỬA HÀNG chấp nhận (`ACTIVE`) hoặc từ chối (`TERMINATED`); quá 7 ngày lời
 * mời không nhận được nữa. Tạm ngưng chỉ giữa `ACTIVE ⇄ SUSPENDED`; chấm dứt là kết thúc (liên kết lại = mời mới).
 */
export const PARTNERSHIP_INVITE_TTL_DAYS = 7
const DAY_MS = 86_400_000

export type PartnershipActor = "CHAIN" | "STORE"

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  PENDING: "Chờ cửa hàng đồng ý",
  ACTIVE: "Đang hợp tác",
  SUSPENDED: "Tạm ngưng",
  TERMINATED: "Đã chấm dứt",
}

const ALLOWED: Record<PartnershipActor, Partial<Record<PartnershipStatus, readonly PartnershipStatus[]>>> = {
  // Chuỗi: rút lời mời, tạm ngưng / mở lại, chấm dứt — KHÔNG tự chấp nhận thay cửa hàng
  CHAIN: { PENDING: ["TERMINATED"], ACTIVE: ["SUSPENDED", "TERMINATED"], SUSPENDED: ["ACTIVE", "TERMINATED"] },
  // Cửa hàng: chấp nhận / từ chối lời mời, tự rời chuỗi
  STORE: { PENDING: ["ACTIVE", "TERMINATED"], ACTIVE: ["TERMINATED"], SUSPENDED: ["TERMINATED"] },
}

export function isPartnershipInviteExpired(validFrom: Date, now: Date = new Date()): boolean {
  return now.getTime() - validFrom.getTime() > PARTNERSHIP_INVITE_TTL_DAYS * DAY_MS
}

export type PartnershipTransitionCheck = { ok: true } | { ok: false; reason: string }

export function checkPartnershipTransition(
  from: PartnershipStatus,
  to: PartnershipStatus,
  actor: PartnershipActor,
): PartnershipTransitionCheck {
  if ((ALLOWED[actor][from] ?? []).includes(to)) return { ok: true }
  if (from === "TERMINATED") return { ok: false, reason: "Liên kết đã chấm dứt — muốn hợp tác lại thì gửi lời mời mới." }
  if (actor === "CHAIN" && from === "PENDING" && to === "ACTIVE") {
    return { ok: false, reason: "Liên kết chỉ hoạt động khi cửa hàng đồng ý lời mời." }
  }
  return {
    ok: false,
    reason: `Không chuyển được từ "${PARTNERSHIP_STATUS_LABELS[from]}" sang "${PARTNERSHIP_STATUS_LABELS[to]}".`,
  }
}
