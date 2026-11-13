/**
 * subcontract-countdown.ts
 *
 * Tiện ích và logic tính toán mốc thời gian hoàn thành (Deadline) và đồng hồ đếm ngược
 * cho 4 bước trong quy trình Thẻ Gia Công Chuỗi.
 * Clean Architecture — Pure TypeScript, độc lập với DB hay UI framework.
 */

import { dayStartMs, slotEndMinutes } from "@/modules/orders/domain/delivery-slot"

/** Mốc hiển thị khi khung giờ không nêu giờ cụ thể (10:00). */
const DEFAULT_DEADLINE_MINUTES = 10 * 60

export interface StepMilestoneDeadlines {
  /** Mốc thời gian giao hàng đích (Epoch ms) */
  deliveryTimestampMs: number | null
  /** Bước 1: Thời điểm hết hạn ân hạn kiểm tra kho (ISO string) */
  step1GraceExpiresAt: string | null
  /** Bước 2: Hạn chót hoàn thành cắm & nộp ảnh QC (Epoch ms) */
  step2QcDeadlineMs: number | null
  /** Bước 3: Hạn chót cung cấp và bàn giao Shipper (Epoch ms) */
  step3ShipperDeadlineMs: number | null
  /** Bước 4: Hạn chót hoàn thành giao hàng & ảnh POD (Epoch ms) */
  step4DeliveryDeadlineMs: number | null
}

export interface CountdownState {
  secondsRemaining: number
  isOverdue: boolean
  formatted: string
  hours: number
  minutes: number
  seconds: number
  targetTimeStr: string
}

/**
 * Phân tích chuỗi delivery_window (date: YYYY-MM-DD, timeSlot: "HH:mm - HH:mm" hoặc "Giờ cụ thể: HH:mm")
 * thành timestamp Epoch ms (+07:00 giờ Việt Nam).
 */
export function parseDeliveryTimestampMs(
  deliveryDate: string | null | undefined,
  deliveryTimeSlot: string | null | undefined
): number | null {
  // Bộ đọc khung giờ chung (audit BL-24); khung không nêu giờ → mốc hiển thị mặc định 10:00 như trước.
  // Khoản trừ "giao trễ" KHÔNG dùng mốc mặc định này — xem `deliveryDeadlineMs` (`orders/domain/delivery-slot.ts`).
  return dayStartMs(deliveryDate, slotEndMinutes(deliveryTimeSlot) ?? DEFAULT_DEADLINE_MINUTES)
}

/**
 * Tính toán mốc hạn chót (Deadlines) cho 4 bước dựa trên giờ giao và cấu hình policy:
 * - Bước 1: 5 phút ân hạn tính từ lúc nhận (graceExpiresAt)
 * - Bước 2 (QC): Hoàn thành trước giờ giao qcMinutesBefore phút (mặc định 45 phút)
 * - Bước 3 (Shipper): Hoàn thành trước giờ giao shipperMinutesBefore phút (mặc định 30 phút)
 * - Bước 4 (POD): Hoàn thành trước hoặc đúng giờ hẹn giao hàng (deliveryTimestampMs)
 */
export function calculateStepMilestoneDeadlines(params: {
  deliveryTimestampMs: number | null
  graceExpiresAt: string | null | undefined
  qcMinutesBefore?: number
  shipperMinutesBefore?: number
}): StepMilestoneDeadlines {
  const deliveryMs = params.deliveryTimestampMs
  const qcBefore = params.qcMinutesBefore ?? 45
  const shipperBefore = params.shipperMinutesBefore ?? 30

  if (!deliveryMs) {
    return {
      deliveryTimestampMs: null,
      step1GraceExpiresAt: params.graceExpiresAt ?? null,
      step2QcDeadlineMs: null,
      step3ShipperDeadlineMs: null,
      step4DeliveryDeadlineMs: null,
    }
  }

  return {
    deliveryTimestampMs: deliveryMs,
    step1GraceExpiresAt: params.graceExpiresAt ?? null,
    step2QcDeadlineMs: deliveryMs - qcBefore * 60_000,
    step3ShipperDeadlineMs: deliveryMs - shipperBefore * 60_000,
    step4DeliveryDeadlineMs: deliveryMs,
  }
}

/**
 * Định dạng mốc thời gian dạng HH:mm (giờ Việt Nam UTC+7)
 */
export function formatTargetTimeHm(targetMs: number | null | undefined): string {
  if (!targetMs) return ""
  const dt = new Date(targetMs)
  if (Number.isNaN(dt.getTime())) return ""
  const vnDt = new Date(dt.getTime() + 7 * 3600_000)
  const h = String(vnDt.getUTCHours()).padStart(2, "0")
  const m = String(vnDt.getUTCMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

/**
 * Tính trạng thái đếm ngược tại thời điểm hiện tại:
 * - Nếu còn thời gian: isOverdue = false, formatted: "HH:mm:ss" hoặc "mm:ss"
 * - Nếu quá hạn: isOverdue = true, formatted: "Quá hạn MM phút"
 */
export function calculateCountdownState(
  targetMs: number | null | undefined,
  nowMs: number = Date.now()
): CountdownState | null {
  if (!targetMs) return null

  const diffMs = targetMs - nowMs
  const isOverdue = diffMs < 0
  const absDiffSec = Math.floor(Math.abs(diffMs) / 1000)

  const hours = Math.floor(absDiffSec / 3600)
  const minutes = Math.floor((absDiffSec % 3600) / 60)
  const seconds = absDiffSec % 60

  const targetTimeStr = formatTargetTimeHm(targetMs)

  let formatted = ""
  if (isOverdue) {
    const overdueMin = Math.floor(absDiffSec / 60)
    if (overdueMin < 60) {
      formatted = `Quá ${overdueMin} phút`
    } else {
      const ovH = Math.floor(overdueMin / 60)
      const ovM = overdueMin % 60
      formatted = `Quá ${ovH}h ${ovM}p`
    }
  } else {
    if (hours > 0) {
      formatted = `${hours}h ${String(minutes).padStart(2, "0")}p ${String(seconds).padStart(2, "0")}s`
    } else {
      formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
  }

  return {
    secondsRemaining: Math.floor(diffMs / 1000),
    isOverdue,
    formatted,
    hours,
    minutes,
    seconds,
    targetTimeStr,
  }
}
