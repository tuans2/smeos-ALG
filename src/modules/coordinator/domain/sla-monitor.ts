/**
 * Domain: SLA Monitor & Intelligent Latency Warning (SC-01..06)
 * Giám sát tuân thủ cam kết thời gian giao hàng (SLA) & cảnh báo trễ đơn thông minh.
 * Pure logic — không phụ thuộc Prisma hay HTTP.
 */

import type { CoordinatorStage } from "./coordinator-types"

export type SlaStatus = "ON_TRACK" | "NEAR_BREACH" | "BREACHED"

export interface SlaOrderEvaluation {
  status: SlaStatus
  label: string
  colorToken: string
  badgeVariant: "success" | "warning" | "danger" | "neutral"
  suggestedAction: string | null
}

const TERMINAL_STAGES: ReadonlySet<CoordinatorStage> = new Set([
  "COMPLETED",
  "CANCELLED",
  "DELIVERED",
])

/**
 * Phân loại trạng thái SLA theo thời gian còn lại (SC-01).
 * - BREACHED: Quá hạn giao (timeRemaining < 0)
 * - NEAR_BREACH: Sắp trễ (< 30 phút)
 * - ON_TRACK: Đúng tiến độ (> 30 phút hoặc đã giao xong)
 */
export function classifySlaStatus(
  timeRemainingMinutes: number | null,
  stage: CoordinatorStage
): SlaStatus {
  if (TERMINAL_STAGES.has(stage)) return "ON_TRACK"
  if (timeRemainingMinutes === null) return "ON_TRACK"
  if (timeRemainingMinutes < 0) return "BREACHED"
  if (timeRemainingMinutes <= 30) return "NEAR_BREACH"
  return "ON_TRACK"
}

/**
 * Gợi ý hành động can thiệp / tái điều phối thông minh khi sắp trễ hoặc vỡ SLA (SC-02).
 */
export function suggestEscalationAction(
  status: SlaStatus,
  stage: CoordinatorStage,
  hasPartner: boolean
): string | null {
  if (status === "ON_TRACK") return null

  if (status === "BREACHED") {
    if (stage === "INTAKE" || stage === "VALIDATING" || stage === "PLANNING" || stage === "ASSIGNING" || !hasPartner) {
      return "Tái điều phối khẩn: Gán ngay cho đối tác dự phòng gần nhất"
    }
    if (stage === "IN_PRODUCTION") {
      return "Cảnh báo xưởng: Đẩy nhanh hoàn thiện hoặc gọi thợ hỗ trợ cắm"
    }
    if (stage === "QUALITY_CHECK") {
      return "Duyệt QC hoả tốc để bàn giao đơn vị vận chuyển ngay"
    }
    if (stage === "DISPATCHING") {
      return "Liên hệ shipper khẩn hoặc điều phương tiện giao hoả tốc"
    }
    return "Mở sự cố trễ đơn PARTNER_DELAY để tái điều phối"
  }

  // NEAR_BREACH (< 30 phút)
  if (stage === "ASSIGNING" || !hasPartner) {
    return "Ưu tiên gán xưởng bán kính < 3km để kịp giờ"
  }
  if (stage === "IN_PRODUCTION") {
    return "Yêu cầu xưởng gửi ảnh thành phẩm ngay để duyệt QC"
  }
  if (stage === "QUALITY_CHECK") {
    return "Ưu tiên duyệt QC ngay để kịp xuất xưởng"
  }
  if (stage === "DISPATCHING") {
    return "Kiểm tra định vị shipper trên tuyến đường giao"
  }
  return "Theo dõi sát tiến độ đơn hàng"
}

/**
 * Đánh giá tổng hợp SLA cho một đơn hàng (SC-01, SC-02).
 */
export function evaluateOrderSla(params: {
  timeRemainingMinutes: number | null
  stage: CoordinatorStage
  hasPartner: boolean
}): SlaOrderEvaluation {
  const status = classifySlaStatus(params.timeRemainingMinutes, params.stage)
  const suggestedAction = suggestEscalationAction(status, params.stage, params.hasPartner)

  switch (status) {
    case "BREACHED":
      return {
        status,
        label: "Đã quá hạn SLA",
        colorToken: "text-danger border-danger/40 bg-danger-bg",
        badgeVariant: "danger",
        suggestedAction,
      }
    case "NEAR_BREACH":
      return {
        status,
        label: "Cảnh báo sắp trễ (<30p)",
        colorToken: "text-warning-text border-warning/40 bg-warning-bg",
        badgeVariant: "warning",
        suggestedAction,
      }
    case "ON_TRACK":
    default:
      return {
        status,
        label: "Đúng tiến độ",
        colorToken: "text-success border-success/40 bg-success-bg",
        badgeVariant: "success",
        suggestedAction: null,
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BÁO CÁO VÀ THỐNG KÊ TUÂN THỦ SLA THEO ĐỐI TÁC (SC-04, SC-06)
// ─────────────────────────────────────────────────────────────────────────────

export interface PartnerSlaStat {
  partnerName: string
  totalOrders: number
  onTrackOrders: number
  nearBreachOrders: number
  breachedOrders: number
  complianceRatePercent: number
}

export interface SlaSummaryReport {
  totalActiveOrders: number
  onTrackCount: number
  nearBreachCount: number
  breachedCount: number
  overallComplianceRatePercent: number
  partnerStats: PartnerSlaStat[]
}

export interface SlaOrderInput {
  stage: CoordinatorStage
  timeRemaining: number | null
  partnerName: string | null
}

/**
 * Tổng hợp báo cáo tuân thủ SLA toàn mạng lưới và theo từng đối tác (SC-06).
 */
export function computeSlaSummaryReport(orders: SlaOrderInput[]): SlaSummaryReport {
  const activeOrders = orders.filter((o) => !TERMINAL_STAGES.has(o.stage))

  let onTrack = 0
  let nearBreach = 0
  let breached = 0

  const partnerMap: Record<string, { total: number; onTrack: number; nearBreach: number; breach: number }> = {}

  for (const o of activeOrders) {
    const status = classifySlaStatus(o.timeRemaining, o.stage)
    const partner = o.partnerName || "Chưa phân công"

    if (!partnerMap[partner]) {
      partnerMap[partner] = { total: 0, onTrack: 0, nearBreach: 0, breach: 0 }
    }
    partnerMap[partner].total += 1

    if (status === "BREACHED") {
      breached += 1
      partnerMap[partner].breach += 1
    } else if (status === "NEAR_BREACH") {
      nearBreach += 1
      partnerMap[partner].nearBreach += 1
    } else {
      onTrack += 1
      partnerMap[partner].onTrack += 1
    }
  }

  const partnerStats: PartnerSlaStat[] = Object.entries(partnerMap).map(([name, data]) => ({
    partnerName: name,
    totalOrders: data.total,
    onTrackOrders: data.onTrack,
    nearBreachOrders: data.nearBreach,
    breachedOrders: data.breach,
    complianceRatePercent: data.total > 0
      ? Math.round(((data.total - data.breach) / data.total) * 100)
      : 100,
  }))

  const total = activeOrders.length
  const overallRate = total > 0 ? Math.round(((total - breached) / total) * 100) : 100

  return {
    totalActiveOrders: total,
    onTrackCount: onTrack,
    nearBreachCount: nearBreach,
    breachedCount: breached,
    overallComplianceRatePercent: overallRate,
    partnerStats,
  }
}
