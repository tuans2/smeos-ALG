/**
 * cancel-subcontract-reminder-steps.ts
 *
 * First-Wins Mutex Utility — Hủy các bước nhắc việc đang pending khi một trong hai luồng
 * (Auto-Stream hoặc Coordinator-Stream) hoàn thành trước.
 *
 * Nguyên tắc: Khi coordinator trực tiếp thực hiện hành động (upload ảnh, điền shipper,
 * xác nhận giao hàng), các reminder timer tương ứng phải bị cancel ngay lập tức
 * để không gửi tin nhắn thừa cho cửa hàng.
 *
 * Giá trị đặc biệt: "CANCELLED_BY_COORDINATOR:<ISO_TIMESTAMP>"
 * → Sweep engine sẽ nhận ra và skip, không phân biệt với trường hợp đã gửi thật.
 */

import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import { log } from "@/core/observability/log"
import type { ReminderStep } from "./process-dispatch-reminders"

export type CancelReason = "coordinator_action" | "store_action_via_link"

export interface CancelReminderStepsInput {
  organizationId: string
  orderId: string
  /** Các reminder steps cần hủy */
  steps: ReminderStep[]
  /** Lý do hủy */
  reason: CancelReason
  /** Ai thực hiện hành động triệt tiêu */
  actorId: string
}

export interface CancelReminderStepsResult {
  orderId: string
  cancelledSteps: ReminderStep[]
  alreadyDoneSteps: ReminderStep[]
}

/**
 * Đánh dấu các reminder steps là đã bị hủy bởi coordinator hoặc store.
 * Sweep engine đọc `remindersSent[step]` — nếu có giá trị (kể cả "CANCELLED_...") thì skip.
 *
 * Ghi dưới khoá dòng (`mutateMetadata`): không đè thay đổi của luồng khác chạy cùng lúc.
 */
export async function cancelSubcontractReminderSteps(
  input: CancelReminderStepsInput
): Promise<CancelReminderStepsResult> {
  const { organizationId, orderId, steps, reason, actorId } = input
  const now = new Date()
  const cancelMarker = `CANCELLED_BY_${reason.toUpperCase()}:${now.toISOString()}`

  const cancelledSteps: ReminderStep[] = []
  const alreadyDoneSteps: ReminderStep[] = []

  // Đọc và ghi dưới khoá dòng — chỉ đổi `remindersSent`, giữ nguyên phần còn lại của phiên
  const found = await new SubcontractStepStore().mutateMetadata(organizationId, orderId, (current) => {
    const subState = current.subcontract_dispatch as Record<string, unknown> | undefined
    if (!subState) return { next: null, result: false }
    const sent = { ...((subState.remindersSent as Record<string, string> | undefined) ?? {}) }
    for (const step of steps) {
      const existing = sent[step]
      if (existing && !existing.startsWith("CANCELLED_")) {
        alreadyDoneSteps.push(step) // đã gửi thật — "đã xong", không phải "đang chờ"
      } else {
        sent[step] = cancelMarker
        cancelledSteps.push(step)
      }
    }
    if (cancelledSteps.length === 0) return { next: null, result: true }
    return { next: { ...current, subcontract_dispatch: { ...subState, remindersSent: sent } }, result: true }
  })

  if (!found) {
    log.warn("cancel_reminder_steps.coord_not_found", { orderId, organizationId })
    return { orderId, cancelledSteps: [], alreadyDoneSteps: [] }
  }
  if (cancelledSteps.length === 0) return { orderId, cancelledSteps: [], alreadyDoneSteps }

  log.info("cancel_reminder_steps.done", {
    orderId,
    actorId,
    reason,
    cancelledSteps,
    alreadyDoneSteps,
  })

  return { orderId, cancelledSteps, alreadyDoneSteps }
}

/**
 * Helper: lấy danh sách steps liên quan đến một milestone để cancel toàn bộ.
 * Ví dụ: cancelMilestoneSteps("M2") → ["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"]
 */
export function getMilestoneSteps(milestone: "M2" | "M3" | "M4"): ReminderStep[] {
  const map: Record<string, ReminderStep[]> = {
    M2: ["M2_QC", "M2_QC_RETRY", "M2_QC_ESCALATED"],
    M3: ["M3_SHIPPER", "M3_SHIPPER_RETRY", "M3_SHIPPER_ESCALATED", "M3_DISPATCH"],
    M4: ["M4_DELIVERY", "M4_DELIVERY_RETRY", "M4_DELIVERY_ESCALATION", "M4_OVERDUE"],
  }
  return map[milestone] ?? []
}
