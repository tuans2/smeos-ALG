/**
 * Luật nghiệp vụ của từng thao tác điều phối (Chức năng 12) — thuần.
 * Mỗi hàm trả `{ ok: false, reason }` thay vì ném lỗi HTTP: tầng use-case
 * dịch sang `AppError` (422/409), domain không biết HTTP.
 */

import type { CoordinatorStage, CoordinationRiskLevel } from "./coordinator-types"
import { stageLabel } from "./stage-labels"
import { unpaidClosureReason } from "./stage-transitions"

export type RuleResult = { ok: true } | { ok: false; reason: string }

// ── F04 · Nhãn và việc kế tiếp theo bước ──────────────────────────────────


const NEXT_ACTIONS: Record<CoordinatorStage, string> = {
  INTAKE: "Kiểm tra thông tin đơn trước khi lập kế hoạch",
  VALIDATING: "Bổ sung thông tin còn thiếu từ bộ phận bán hàng",
  PLANNING: "Chốt kế hoạch sản xuất và giờ lấy hàng",
  ASSIGNING: "Phân công đối tác xưởng ngoài hoặc thợ chế tác",
  IN_PRODUCTION: "Theo dõi xưởng làm đúng công thức chế tác",
  QUALITY_CHECK: "Kiểm ảnh thành phẩm đối chiếu ảnh mẫu",
  DISPATCHING: "Theo dõi shipper tới người nhận, thu ảnh giao hàng",
  DELIVERED: "Nghiệm thu, đóng đơn và chốt tiền công đối tác",
  COMPLETED: "Đơn đã hoàn thành",
  EXCEPTION: "Xử lý sự cố phát sinh",
  CANCELLED: "Đơn đã huỷ",
}

export { stageLabel }

export function defaultNextAction(stage: CoordinatorStage): string {
  return NEXT_ACTIONS[stage] ?? "Tiếp tục tiến trình điều phối"
}

// ── F05 · Phân công đối tác ───────────────────────────────────────────────

export function checkPartnerAssignment(params: {
  stage: CoordinatorStage
  partnerActive: boolean
}): RuleResult {
  if (!["PLANNING", "ASSIGNING", "IN_PRODUCTION"].includes(params.stage)) {
    return { ok: false, reason: `Không phân công được khi đơn ở bước ${params.stage}.` }
  }
  if (!params.partnerActive) return { ok: false, reason: "Đối tác đang tạm ngưng nhận đơn." }
  return { ok: true }
}

// ── F08 · Cập nhật sản xuất ───────────────────────────────────────────────

export function checkProductionUpdate(params: {
  stage: CoordinatorStage
  progressPercent: number
  markReady: boolean
  finishedAssetCount: number
}): RuleResult {
  if (params.stage !== "IN_PRODUCTION") {
    return { ok: false, reason: `Chỉ cập nhật tiến độ khi đơn đang cắm (hiện: ${params.stage}).` }
  }
  if (!Number.isInteger(params.progressPercent) || params.progressPercent < 0 || params.progressPercent > 100) {
    return { ok: false, reason: "Tiến độ phải là số nguyên 0–100." }
  }
  if (params.markReady && params.finishedAssetCount === 0) {
    return { ok: false, reason: "Báo cắm xong phải kèm ít nhất một ảnh thành phẩm để QC." }
  }
  return { ok: true }
}

// ── F10 · Kiểm định chất lượng ───────────────────────────────────────────

export type QcDecision = "PASSED" | "REWORK_REQUESTED" | "REJECTED"

export function checkQcDecision(params: {
  stage: CoordinatorStage
  decision: QcDecision
  notes: string | null | undefined
  imageCount: number
}): RuleResult {
  if (params.stage !== "QUALITY_CHECK") {
    return { ok: false, reason: `Chỉ kiểm QC khi đơn ở bước QUALITY_CHECK (hiện: ${params.stage}).` }
  }
  if (params.imageCount === 0) return { ok: false, reason: "Không có ảnh thành phẩm để kiểm." }
  if (params.decision !== "PASSED" && !params.notes?.trim()) {
    return { ok: false, reason: "QC không đạt phải ghi rõ lý do để xưởng sửa." }
  }
  return { ok: true }
}

/** Bước kế tiếp theo kết luận QC. REJECTED mở sự cố `QC_FAILURE`. */
export function stageAfterQc(decision: QcDecision): CoordinatorStage {
  if (decision === "PASSED") return "DISPATCHING"
  if (decision === "REWORK_REQUESTED") return "IN_PRODUCTION"
  return "EXCEPTION"
}

// ── F11/F12 · Giao hàng và theo dõi giao hàng ─────────────────────────────

export type DeliveryEvent = "PICKED_UP" | "ON_THE_WAY" | "DELIVERED_SUCCESS" | "DELIVERY_FAILED"

const DELIVERY_ORDER: Record<Exclude<DeliveryEvent, "DELIVERY_FAILED">, number> = {
  PICKED_UP: 1,
  ON_THE_WAY: 2,
  DELIVERED_SUCCESS: 3,
}

export function checkDeliveryUpdate(params: {
  stage: CoordinatorStage
  currentState: string | null
  event: DeliveryEvent
  shipperName: string | null | undefined
  podAssetId: string | null | undefined
  recipientSignedName: string | null | undefined
  failureReason: string | null | undefined
  /**
   * Bắt buộc ảnh giao hàng (PO 04/11/2026, checklist ALG 4.18). Mặc định bật; chỉ khi Điều hành tắt
   * yêu cầu ảnh trong Cài đặt thì tên người ký nhận mới thay được ảnh.
   */
  requirePodPhoto?: boolean | undefined
}): RuleResult {
  if (params.stage !== "DISPATCHING") {
    return { ok: false, reason: `Chỉ cập nhật giao hàng khi đơn đang giao (hiện: ${params.stage}).` }
  }
  if (!params.shipperName?.trim()) return { ok: false, reason: "Thiếu tên shipper." }
  if (params.event === "DELIVERY_FAILED") {
    if (!params.failureReason?.trim()) return { ok: false, reason: "Giao thất bại phải ghi lý do." }
    return { ok: true }
  }
  const current = params.currentState as keyof typeof DELIVERY_ORDER | null
  if (current && current in DELIVERY_ORDER && DELIVERY_ORDER[params.event] < DELIVERY_ORDER[current]) {
    return { ok: false, reason: `Không lùi trạng thái giao từ ${current} về ${params.event}.` }
  }
  if (params.event === "DELIVERED_SUCCESS" && !params.podAssetId) {
    if (params.requirePodPhoto !== false) return { ok: false, reason: "Giao thành công phải có ảnh giao hàng." }
    if (!params.recipientSignedName?.trim()) return { ok: false, reason: "Giao thành công phải có ảnh giao hàng hoặc tên người ký nhận." }
  }
  return { ok: true }
}

/** Trục `delivery_status` của `orders` ứng với từng sự kiện giao. */
export function deliveryStatusFor(event: DeliveryEvent): "DISPATCHED" | "DELIVERING" | "DELIVERED" | "FAILED" {
  switch (event) {
    case "PICKED_UP":
      return "DISPATCHED"
    case "ON_THE_WAY":
      return "DELIVERING"
    case "DELIVERED_SUCCESS":
      return "DELIVERED"
    case "DELIVERY_FAILED":
      return "FAILED"
  }
}

/**
 * F12 — rủi ro trễ giao. Tính lại mỗi lần đọc, không lưu cứng: đồng hồ trôi
 * nên một mức rủi ro ghi xuống lúc 15:00 đã sai lúc 16:30.
 */
export function evaluateRisk(params: {
  stage: CoordinatorStage
  targetDeliveryAt: Date | null
  openExceptionCount: number
  deliveryState: string | null
  now?: Date
}): { riskLevel: CoordinationRiskLevel; reason: string | null; minutesLeft: number | null } {
  const { stage, targetDeliveryAt, openExceptionCount, deliveryState, now = new Date() } = params
  if (stage === "COMPLETED" || stage === "CANCELLED" || stage === "DELIVERED") {
    return { riskLevel: "NORMAL", reason: null, minutesLeft: null }
  }
  if (openExceptionCount > 0) {
    return { riskLevel: "CRITICAL", reason: `${openExceptionCount} sự cố chưa xử lý`, minutesLeft: null }
  }
  if (!targetDeliveryAt) return { riskLevel: "NORMAL", reason: null, minutesLeft: null }

  // ĐP-4a.8 (27/09/2026), Đặc tả trường §4.1 — `timeRemaining`: trước đây chỉ
  // dùng NỘI BỘ để xếp mức rủi ro, giờ trả luôn ra cho T05 hiển thị đếm ngược.
  const minutesLeft = Math.floor((targetDeliveryAt.getTime() - now.getTime()) / 60_000)
  if (minutesLeft < 0) {
    return { riskLevel: "CRITICAL", reason: `Quá giờ hẹn giao ${Math.abs(minutesLeft)} phút`, minutesLeft }
  }
  if (stage === "DISPATCHING") {
    if (minutesLeft <= 15 && deliveryState !== "ON_THE_WAY") {
      return { riskLevel: "AT_RISK", reason: `Còn ${minutesLeft} phút mà shipper chưa lên đường`, minutesLeft }
    }
    return { riskLevel: "NORMAL", reason: null, minutesLeft }
  }
  if (minutesLeft <= 60) {
    return { riskLevel: "AT_RISK", reason: `Còn ${minutesLeft} phút nhưng hoa chưa bàn giao shipper`, minutesLeft }
  }
  if (minutesLeft <= 120 && ["INTAKE", "VALIDATING", "PLANNING", "ASSIGNING"].includes(stage)) {
    return { riskLevel: "ATTENTION", reason: `Còn ${minutesLeft} phút nhưng chưa vào sản xuất`, minutesLeft }
  }
  return { riskLevel: "NORMAL", reason: null, minutesLeft }
}

// ── F13 · Sự cố ─────────────────────────────────────────────────────────

export const EXCEPTION_TYPES = [
  "MISSING_INFORMATION",
  "PARTNER_DECLINE",
  "PARTNER_DELAY",
  "MATERIAL_SHORTAGE",
  "QC_FAILURE",
  "DELIVERY_FAILURE",
  "CUSTOMER_CHANGE",
  "COMMERCIAL_ISSUE",
] as const
export type ExceptionType = (typeof EXCEPTION_TYPES)[number]

export const EXCEPTION_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const
export type ExceptionSeverity = (typeof EXCEPTION_SEVERITIES)[number]

export function checkOpenException(stage: CoordinatorStage): RuleResult {
  if (stage === "COMPLETED" || stage === "CANCELLED") {
    return { ok: false, reason: `Đơn đã kết thúc (${stageLabel(stage)}), không mở sự cố được.` }
  }
  return { ok: true }
}

export function exceptionCode(orderCode: string, sequence: number): string {
  return `EXC-${orderCode}-${String(sequence).padStart(2, "0")}`
}

// ── F14 · Đóng đơn / Huỷ ─────────────────────────────────────────────────

export function checkClosure(params: {
  stage: CoordinatorStage
  openExceptionCount: number
  partnerRating: number | null | undefined
  partnerPayoutVnd: number | null | undefined
  /** Số còn phải thu của đơn; > 0 thì chưa hoàn tất được (PO 04/11/2026, checklist ALG 4.26). */
  balanceVnd?: number | undefined
}): RuleResult {
  if (params.stage !== "DELIVERED") {
    return { ok: false, reason: `Chỉ đóng đơn sau khi đã giao (hiện: ${params.stage}).` }
  }
  if ((params.balanceVnd ?? 0) > 0) {
    return { ok: false, reason: unpaidClosureReason(params.balanceVnd!) }
  }
  if (params.openExceptionCount > 0) {
    return { ok: false, reason: `Còn ${params.openExceptionCount} sự cố chưa xử lý.` }
  }
  if (params.partnerRating != null && (!Number.isInteger(params.partnerRating) || params.partnerRating < 1 || params.partnerRating > 5)) {
    return { ok: false, reason: "Điểm đối tác phải là số nguyên 1–5." }
  }
  if (params.partnerPayoutVnd != null && params.partnerPayoutVnd < 0) {
    return { ok: false, reason: "Tiền công đối tác không âm." }
  }
  return { ok: true }
}

export function checkCancellation(params: { stage: CoordinatorStage; reason: string | null | undefined }): RuleResult {
  if (params.stage === "COMPLETED" || params.stage === "CANCELLED") {
    return { ok: false, reason: `Đơn đã kết thúc (${stageLabel(params.stage)}).` }
  }
  if (params.stage === "DELIVERED") {
    return { ok: false, reason: "Đơn đã giao tới người nhận — không huỷ, hãy mở sự cố về thương mại." }
  }
  if (!params.reason?.trim()) return { ok: false, reason: "Huỷ đơn phải ghi lý do." }
  return { ok: true }
}

/** Mã đơn điều phối: `FLR-YYMMDD-NNNN`, tuần tự theo ngày trong một tổ chức. */
export function coordinatorOrderCode(sequence: number, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `FLR-${yy}${mm}${dd}-${String(sequence).padStart(4, "0")}`
}
