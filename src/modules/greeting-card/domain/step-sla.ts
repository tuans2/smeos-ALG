/**
 * Thời gian chuẩn cho từng bước quy trình Thẻ chào (`organizations.settings.brochure_step_sla`).
 * Điều hành đặt số phút cho mỗi bước; quá thời gian mà bước chưa xong → đơn "kẹt" và
 * người phụ trách bước đó nhận thông báo. Pure TypeScript.
 */
import type { TrackingPipelineStepId } from "./tracking-pipeline-types"
import { dayStartMs, slotEndMinutes } from "@/modules/orders/domain/delivery-slot"

export const STEP_SLA_SETTINGS_KEY = "brochure_step_sla"
export type StepOwner = "SALE" | "ADMIN" | "COORDINATOR"
export const STEP_OWNER_LABEL: Record<StepOwner, string> = { SALE: "Sale", ADMIN: "Điều hành", COORDINATOR: "Điều phối" }

export interface StepSlaRule {
  stepId: TrackingPipelineStepId
  /** Việc đang chờ ở bước này (để Điều hành hiểu đồng hồ tính gì). */
  waitingFor: string
  /** Gợi ý việc cần làm khi quá giờ — hiện trong thông báo. */
  action: string
  owner: StepOwner
  defaultMinutes: number
}

/** Bước Hoàn tất không có thời gian chuẩn. Thứ tự = thứ tự quy trình. */
export const STEP_SLA_RULES: StepSlaRule[] = [
  { stepId: "STEP_1_OPENED", waitingFor: "Gửi link → khách mở link", action: "Nhắc khách mở link", owner: "SALE", defaultMinutes: 5 },
  { stepId: "STEP_2_CHOOSING", waitingFor: "Khách mở link → gửi đơn", action: "Hỏi khách cần tư vấn mẫu nào", owner: "SALE", defaultMinutes: 30 },
  { stepId: "STEP_3_FILLING_FORM", waitingFor: "Khách gửi đơn → báo đã chuyển khoản", action: "Nhắc khách chuyển khoản", owner: "SALE", defaultMinutes: 15 },
  { stepId: "STEP_4_PAYMENT_PENDING", waitingFor: "Khách báo đã chuyển → xác nhận đã nhận tiền", action: "Kiểm tra tài khoản và xác nhận thanh toán (trong 15')", owner: "ADMIN", defaultMinutes: 15 },
  { stepId: "STEP_5_PAYMENT_CONFIRMED", waitingFor: "Đã nhận tiền → Điều phối xác nhận nhận đơn hoặc hoàn tiền", action: "Điều phối xác nhận nhận đơn trong 30' (hoặc hoàn tiền cho khách)", owner: "COORDINATOR", defaultMinutes: 30 },
  { stepId: "STEP_6_ARRANGING", waitingFor: "Đang cắm → có ảnh thành phẩm", action: "Hỏi thợ tiến độ, tải ảnh thành phẩm", owner: "COORDINATOR", defaultMinutes: 120 },
  { stepId: "STEP_7_READY_QC", waitingFor: "Có ảnh thành phẩm → giao cho shipper", action: "Giao đơn cho shipper", owner: "COORDINATOR", defaultMinutes: 30 },
  { stepId: "STEP_8_DELIVERING", waitingFor: "Đang giao → có ảnh người nhận", action: "Liên hệ shipper, cập nhật giao thành công", owner: "COORDINATOR", defaultMinutes: 120 },
]

export const MAX_SLA_MINUTES = 7 * 24 * 60

export interface StepSlaSetting {
  enabled: boolean
  minutes: number
}
export type StepSlaConfig = Partial<Record<TrackingPipelineStepId, StepSlaSetting>>

/** Đọc cài đặt; bước chưa đặt dùng mặc định (đang bật). Giá trị hỏng → mặc định. */
export function parseStepSla(settings: unknown): Record<TrackingPipelineStepId, StepSlaSetting> {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const raw = root[STEP_SLA_SETTINGS_KEY]
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const out = {} as Record<TrackingPipelineStepId, StepSlaSetting>
  for (const rule of STEP_SLA_RULES) {
    const v = obj[rule.stepId] as Record<string, unknown> | undefined
    const minutes = typeof v?.minutes === "number" && Number.isInteger(v.minutes) && v.minutes > 0 && v.minutes <= MAX_SLA_MINUTES
      ? v.minutes
      : rule.defaultMinutes
    out[rule.stepId] = { enabled: v?.enabled !== false, minutes }
  }
  return out
}

export interface StuckInfo {
  stepId: TrackingPipelineStepId
  owner: StepOwner
  overdueMinutes: number
  message: string
}

/**
 * Đơn/link có đang kẹt không: bước hiện tại đã chờ lâu hơn thời gian chuẩn.
 * `stepStartedAt` = lúc vào bước hiện tại (máy chủ tính từ mốc thật của đơn/link).
 */
export function stuckOf(
  item: { currentStepId: TrackingPipelineStepId; stepStartedAt: string },
  sla: Record<TrackingPipelineStepId, StepSlaSetting>,
  now: Date = new Date(),
): StuckInfo | null {
  const rule = STEP_SLA_RULES.find((r) => r.stepId === item.currentStepId)
  const setting = sla[item.currentStepId]
  if (!rule || !setting?.enabled) return null
  const startedAt = Date.parse(item.stepStartedAt)
  if (!Number.isFinite(startedAt)) return null
  const overdue = Math.floor((now.getTime() - startedAt) / 60_000) - setting.minutes
  if (overdue <= 0) return null
  return { stepId: rule.stepId, owner: rule.owner, overdueMinutes: overdue, message: `${rule.action} — quá ${formatMinutes(overdue)}` }
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} phút`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h < 24) return m ? `${h} giờ ${m} phút` : `${h} giờ`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d} ngày ${h % 24} giờ` : `${d} ngày`
}

export interface ExpectedStepSchedule {
  stepKey: "ARRANGING" | "QC" | "DELIVERING"
  label: string
  startIso: string
  endIso: string
  displayRange: string
}

/**
 * Tính ngược timeline dự kiến cho các bước sản xuất & giao hàng (Spec #9 & #12).
 * Từ Delivery Time Window và cấu hình SLA các bước:
 * - Bước 8: Giao hoa (DELIVERING) -> kết thúc lúc delivery window end (hoặc start nếu không rõ)
 * - Bước 7: QC / Đóng gói (READY_QC) -> kết thúc lúc bắt đầu giao
 * - Bước 6: Cắm hoa (ARRANGING) -> kết thúc lúc bắt đầu QC
 */
export function calculateExpectedStepTimeline(
  deliveryDate: string | null | undefined,
  deliveryTimeSlot: string | null | undefined,
  slaConfig: Record<TrackingPipelineStepId, StepSlaSetting>
): {
  arranging?: ExpectedStepSchedule
  readyQc?: ExpectedStepSchedule
  delivering?: ExpectedStepSchedule
} | null {
  if (!deliveryDate) return null

  // Giờ giao đích — bộ đọc khung giờ chung (audit BL-24); không nêu giờ → 10:00 như trước
  const deliveryEndMs = dayStartMs(deliveryDate, slotEndMinutes(deliveryTimeSlot) ?? 10 * 60)
  if (deliveryEndMs === null) return null

  const deliverMinutes = slaConfig.STEP_8_DELIVERING?.minutes ?? 60
  const qcMinutes = slaConfig.STEP_7_READY_QC?.minutes ?? 20
  const arrangeMinutes = slaConfig.STEP_6_ARRANGING?.minutes ?? 60

  const deliverStartMs = deliveryEndMs - deliverMinutes * 60_000
  const qcStartMs = deliverStartMs - qcMinutes * 60_000
  const arrangeStartMs = qcStartMs - arrangeMinutes * 60_000

  const fmtHm = (ms: number) => {
    const dt = new Date(ms)
    // Offset +7
    const vnDt = new Date(dt.getTime() + 7 * 3600_000)
    const h = String(vnDt.getUTCHours()).padStart(2, "0")
    const m = String(vnDt.getUTCMinutes()).padStart(2, "0")
    return `${h}:${m}`
  }

  return {
    arranging: {
      stepKey: "ARRANGING",
      label: "Chế tác",
      startIso: new Date(arrangeStartMs).toISOString(),
      endIso: new Date(qcStartMs).toISOString(),
      displayRange: `${fmtHm(arrangeStartMs)} - ${fmtHm(qcStartMs)}`,
    },
    readyQc: {
      stepKey: "QC",
      label: "Duyệt ảnh & QC",
      startIso: new Date(qcStartMs).toISOString(),
      endIso: new Date(deliverStartMs).toISOString(),
      displayRange: `${fmtHm(qcStartMs)} - ${fmtHm(deliverStartMs)}`,
    },
    delivering: {
      stepKey: "DELIVERING",
      label: "Đang giao hoa",
      startIso: new Date(deliverStartMs).toISOString(),
      endIso: new Date(deliveryEndMs).toISOString(),
      displayRange: `${fmtHm(deliverStartMs)} - ${fmtHm(deliveryEndMs)}`,
    },
  }
}
