/**
 * Hàng đợi lead chung cho Sale (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.3–3.4).
 * Pure TypeScript. Ghép hai nơi lưu lead mà KHÔNG chép dữ liệu: `leads` (nguồn mới) và phiên Thẻ chào
 * chưa có đơn (`greeting_sessions`, chỉ đọc).
 */

export type LeadHeat = "HOT" | "WARM" | "COLD"

export interface LeadQueueItem {
  /** `lead:<id>` hoặc `session:<id>` — duy nhất trong hàng đợi. */
  key: string
  kind: "LEAD" | "BROCHURE_SESSION"
  id: string
  name: string | null
  phone: string | null
  /** Nhãn nguồn tiếng Việt. */
  sourceLabel: string
  /** Lý do vào, bằng lời. */
  reasonLabel: string
  heat: LeadHeat
  status: string
  assigneeUserId: string | null
  nextFollowUpAt: string | null
  lastActivityAt: string
  /** Mở đúng màn xử lý: lead → tab khách tiềm năng; phiên Thẻ chào → màn Thẻ chào (giữ nguyên). */
  href: string
}

const LEAD_REASON_LABELS: Record<string, string> = {
  CONTACT: "Khách cần tư vấn",
  QUOTE_REQUEST: "Khách cần báo giá",
  ABANDONED: "Xem nhưng chưa đặt",
  PAYMENT_TIMEOUT: "Đơn quá hạn thanh toán",
  WALK_IN: "Gọi điện / đến quầy",
  CHAT: "Nhắn tin",
}

const LEAD_SOURCE_LABELS: Record<string, string> = {
  CATALOG_LINK: "Bộ sưu tập chung",
  SHORT_LINK: "Mã QR / link rút gọn",
  LANDING: "Landing page",
  CHAT: "Trò chuyện",
  MANUAL: "Nhập tay",
  BROCHURE: "Bộ sưu tập riêng",
  CHANNEL: "Kênh bán ngoài",
}

export function leadReasonLabel(reason: string | null): string {
  return (reason && LEAD_REASON_LABELS[reason]) || "Khách để lại thông tin"
}

export function leadSourceLabel(source: string | null): string {
  return (source && LEAD_SOURCE_LABELS[source]) || "Khác"
}

/** Lead "nóng" khi khách đã gần mua: cần báo giá, vừa lỡ thanh toán. */
export function leadHeat(reason: string | null): LeadHeat {
  if (reason === "PAYMENT_TIMEOUT" || reason === "QUOTE_REQUEST") return "HOT"
  return "WARM"
}

/** Phiên Thẻ chào: đã chọn mẫu = nóng; đã mở/xem = ấm; chưa mở = nguội. */
export function sessionHeat(status: string): LeadHeat {
  if (status === "SELECTED") return "HOT"
  if (status === "OPENED" || status === "BROWSING") return "WARM"
  return "COLD"
}

export function sessionReasonLabel(status: string): string {
  if (status === "SELECTED") return "Đã chọn mẫu nhưng chưa đặt"
  if (status === "OPENED" || status === "BROWSING") return "Đã xem nhưng chưa đặt"
  return "Đã gửi link, khách chưa mở"
}

const HEAT_RANK: Record<LeadHeat, number> = { HOT: 0, WARM: 1, COLD: 2 }

/**
 * Thứ tự làm việc: quá hạn gọi lại lên đầu → nóng trước → hạn gọi lại gần trước → mới hoạt động trước.
 */
export function sortLeadQueue(items: readonly LeadQueueItem[], now: Date): LeadQueueItem[] {
  const due = (i: LeadQueueItem) => (i.nextFollowUpAt && new Date(i.nextFollowUpAt) <= now ? 0 : 1)
  return [...items].sort((a, b) =>
    due(a) - due(b) ||
    HEAT_RANK[a.heat] - HEAT_RANK[b.heat] ||
    (a.nextFollowUpAt ?? "9999").localeCompare(b.nextFollowUpAt ?? "9999") ||
    b.lastActivityAt.localeCompare(a.lastActivityAt),
  )
}
