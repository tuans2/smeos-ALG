/**
 * Chính sách Hủy bỏ hiển thị & Khôi phục đơn hàng / link Thẻ chào (Task 14/10/2026).
 * Pure TypeScript — không phụ thuộc DB hay Prisma.
 */

export const DISMISSAL_TIMEOUT_MS = 5 * 60 * 1000 // 5 phút

/** Quyền duyệt/bỏ trực tiếp/khôi phục: R6 — chỉ Điều hành (PO 14/10/2026). Sale, Điều phối chỉ đề xuất. */
export const DISMISSAL_DECIDE_CAPABILITY = "R6"

export function canDecideDismissal(capabilities: ReadonlySet<string> | readonly string[]): boolean {
  return Array.isArray(capabilities) ? capabilities.includes(DISMISSAL_DECIDE_CAPABILITY) : (capabilities as ReadonlySet<string>).has(DISMISSAL_DECIDE_CAPABILITY)
}

export const DISMISSAL_REASONS = [
  { id: "CHANGED_MIND", label: "Khách đổi ý không mua nữa" },
  { id: "PRICE_CHECK_ONLY", label: "Khách chỉ vào khảo giá" },
  { id: "DUPLICATE", label: "Tạo trùng lặp / Gửi nhầm link" },
  { id: "UNREACHABLE", label: "Không liên lạc được với khách" },
  { id: "OUT_OF_STOCK", label: "Hết hoa theo yêu cầu của khách" },
  { id: "OTHER", label: "Lý do khác" },
] as const

export type DismissalReasonId = (typeof DISMISSAL_REASONS)[number]["id"]

export interface DismissalProposalInput {
  id: string
  type: "ORDER" | "SESSION"
  reasonId: DismissalReasonId | string
  reasonText: string
  note?: string | undefined
}

export interface DismissalInfo {
  status: "PENDING" | "APPROVED" | "REJECTED"
  reason: string
  category?: string | undefined
  note?: string | undefined
  proposedBy: string
  proposedByName?: string | undefined
  proposedAt: string
  decidedBy?: string | undefined
  decidedByName?: string | undefined
  decidedAt?: string | undefined
  autoDismissed?: boolean | undefined
}

/** Đọc phòng thủ bản ghi bỏ hiển thị lưu trong JSON (null/rác → không có). */
export function dismissalOf(v: unknown): DismissalInfo | undefined {
  if (!v || typeof v !== "object") return undefined
  const d = v as Partial<DismissalInfo>
  return d.status === "PENDING" || d.status === "APPROVED" || d.status === "REJECTED" ? (d as DismissalInfo) : undefined
}

/**
 * Kiểm tra xem đơn/link có đủ điều kiện để Sale đề xuất hủy / loại bỏ hiển thị hay không.
 * Điều kiện: Chưa thanh toán (paidVnd <= 0), chưa bị hủy trước đó.
 */
export function canProposeDismissal(item: {
  isCancelled?: boolean | undefined
  paidVnd?: number | undefined
  currentStepId?: string | undefined
}): { allowed: boolean; reason?: string } {
  if (item.isCancelled) {
    return { allowed: false, reason: "Đơn/link này đã bị hủy hoặc bỏ hiển thị trước đó." }
  }
  if ((item.paidVnd ?? 0) > 0) {
    return {
      allowed: false,
      reason: "Đơn hàng đã có khoản thanh toán, vui lòng làm thủ tục Hủy đơn & Hoàn tiền qua Điều hành.",
    }
  }
  // Nếu đã qua bước thanh toán và đang sản xuất/giao hàng
  const postPaymentSteps = [
    "STEP_5_PAYMENT_CONFIRMED",
    "STEP_6_ARRANGING",
    "STEP_7_READY_QC",
    "STEP_8_DELIVERING",
    "STEP_9_COMPLETED",
  ]
  if (item.currentStepId && postPaymentSteps.includes(item.currentStepId)) {
    return {
      allowed: false,
      reason: "Đơn đã bước vào giai đoạn chế tác/giao hàng, không thể loại bỏ theo quy trình chưa thanh toán.",
    }
  }
  return { allowed: true }
}

/**
 * Kiểm tra xem đề xuất hủy đã quá thời hạn 5 phút chưa.
 */
export function isDismissalTimedOut(proposedAt: string, nowMs = Date.now()): boolean {
  const t = Date.parse(proposedAt)
  if (!Number.isFinite(t)) return false
  return nowMs - t >= DISMISSAL_TIMEOUT_MS
}

/**
 * Thời gian còn lại của đếm ngược 5 phút (ms).
 */
export function remainingDismissalMs(proposedAt: string, nowMs = Date.now()): number {
  const t = Date.parse(proposedAt)
  if (!Number.isFinite(t)) return 0
  return Math.max(0, DISMISSAL_TIMEOUT_MS - (nowMs - t))
}

/**
 * Định dạng thời gian đếm ngược dạng mm:ss (vd: 04:32).
 */
export function formatCountdownMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
