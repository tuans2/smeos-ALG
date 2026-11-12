/**
 * Ai chịu trách nhiệm một link (PO 06/10/2026): người bấm "Sao chép" trong ALG.
 * Link cũ không qua nút Sao chép → người phụ trách mặc định do Điều hành chọn. Pure TypeScript.
 */

export const DEFAULT_OWNER_SETTINGS_KEY = "brochure_default_owner"
/** Mã link sao chép: 10 ký tự ngẫu nhiên (bảng chữ không nhầm lẫn) — `/s/<mã>`. */
export const SHARE_CODE_LENGTH = 10
export const SHARE_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{10}$/

/** Sự kiện hành trình đánh dấu mốc (lưu ở `greeting_journey_events`). */
export const LINK_COPIED_EVENT = "LINK_COPIED"
export const SHARE_OPEN_EVENT = "SHARE_OPEN"

export function parseDefaultOwnerId(settings: unknown): string | null {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[DEFAULT_OWNER_SETTINGS_KEY]
  const id = raw && typeof raw === "object" ? (raw as Record<string, unknown>).user_id : null
  return typeof id === "string" && id ? id : null
}

/** Người phụ trách link cũ: người Điều hành chọn (nếu còn trong tiệm), không thì chủ tiệm. */
export function resolveDefaultOwner(chosenId: string | null, activeMemberIds: string[], founderId: string | null): string | null {
  if (chosenId && activeMemberIds.includes(chosenId)) return chosenId
  return founderId
}

export type LinkKind = "PERSONAL" | "SHARED" | "LEGACY"

/** Trạng thái hiển thị của một link chưa thành đơn. */
export function pendingLinkTitle(s: { status: string; copiedAt: string | null; kind: LinkKind }): string {
  if (s.status === "CREATED") return s.copiedAt ? "Đã gửi link — khách chưa mở" : "Đã tạo link — chưa sao chép gửi khách"
  if (s.status === "OPENED" || s.status === "BROWSING") return "Khách đã mở — đang xem mẫu"
  if (s.status === "SELECTED") return "Khách đã chọn mẫu — chưa đặt"
  return "Khách đang đặt"
}

export interface LinkFacts {
  kind: LinkKind
  /** Lần sao chép đầu tiên (link riêng) — `null` = chưa gửi khách. */
  copiedAt: string | null
  /** Kênh lúc sao chép link bộ sưu tập (zalo, facebook…). */
  shareChannel: string | null
}

/** Đọc từ sự kiện hành trình của phiên: link riêng / link sao chép / link cũ. */
export function linkFactsOf(session: {
  sale_id: string
  events?: Array<{ event_type: string; created_at: Date; metadata?: unknown }>
}): LinkFacts {
  const events = session.events ?? []
  const share = events.find((e) => e.event_type === SHARE_OPEN_EVENT)
  const copied = events.find((e) => e.event_type === LINK_COPIED_EVENT)
  const meta = share?.metadata && typeof share.metadata === "object" ? (share.metadata as Record<string, unknown>) : {}
  return {
    kind: share ? "SHARED" : session.sale_id === "public" ? "LEGACY" : "PERSONAL",
    copiedAt: copied ? copied.created_at.toISOString() : null,
    shareChannel: typeof meta.channel === "string" ? meta.channel : null,
  }
}
