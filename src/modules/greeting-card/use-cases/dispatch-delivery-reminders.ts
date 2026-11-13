/**
 * dispatch-delivery-reminders.ts
 *
 * Xử lý đánh giá và phát các tin nhắn nhắc việc Hoàn Thành Giao Hàng & Tải Ảnh POD (M4) theo 3 cấp độ:
 * - Lần 1 (M4_DELIVERY): Nhắc xác nhận và tải ảnh giao hàng (POD) khi đến hoặc quá giờ hẹn giao
 * - Lần 2 (M4_DELIVERY_RETRY): Giục khẩn cấp sau 5 phút nếu chưa có ảnh xác nhận (tối đa 2 lần nhắc)
 * - Báo động đỏ (M4_DELIVERY_ESCALATION): Gửi cảnh báo đỏ tới Điều phối viên kèm hotline gọi trực tiếp nếu sau 5 phút nữa vẫn chưa hoàn tất giao hàng.
 */

import type { TenantContext } from "@/core/tenancy"
import { renderDispatchMessage, type ChainDispatchPolicy } from "../domain/chain-dispatch-policy"
import { buildDispatchTitle } from "../domain/dispatch-message-titles"
import type { IDispatchNotifier } from "./dispatch-subcontract-order"
import type { BranchCandidate } from "../domain/chain-dispatch-engine"
import type { ProcessOrderReminderInput, ReminderStepExecutionResult } from "./process-dispatch-reminders"

/** First-Wins Mutex: ISO timestamp (sent) hoặc CANCELLED_BY_* (cancelled) đều coi là "đã xử lý" */
function isStepHandled(remindersSent: Record<string, string>, step: string): boolean {
  return Boolean(remindersSent[step])
}

export interface DeliveryMilestoneParams {
  ctx: TenantContext
  input: ProcessOrderReminderInput
  policy: ChainDispatchPolicy
  branch: BranchCandidate
  remindersSent: Record<string, string>
  minutesUntilDelivery: number
  submitDeliveryUrl: string
  notifier: IDispatchNotifier
  now: Date
}

export async function evaluateDeliveryMilestones({
  ctx,
  input,
  policy,
  branch,
  remindersSent,
  minutesUntilDelivery,
  submitDeliveryUrl,
  notifier,
  now,
}: DeliveryMilestoneParams): Promise<ReminderStepExecutionResult[]> {
  const results: ReminderStepExecutionResult[] = []
  const nowMs = now.getTime()

  // Mốc M4: Nhắc hoàn thành giao hàng & tải ảnh POD khi đến hoặc quá giờ hẹn giao
  const overdueMinutes = minutesUntilDelivery <= 0 ? Math.abs(minutesUntilDelivery) : 0
  const deliveryDelayThreshold = policy.milestoneReminders.deliveryReminderMinutesAfter

  const isDeliveryDue =
    input.forceStep === "M4_DELIVERY" ||
    (minutesUntilDelivery <= -deliveryDelayThreshold &&
      !input.hasDeliveryProof &&
      input.deliveryStatus !== "DELIVERED")

  // 4a. Nhắc lần 1 (M4_DELIVERY): Kích hoạt khi đến/quá giờ giao mà chi nhánh chưa cập nhật POD
  if (isDeliveryDue && !isStepHandled(remindersSent, "M4_DELIVERY") && !input.hasDeliveryProof && input.deliveryStatus !== "DELIVERED") {
    const text = renderDispatchMessage(policy.messageTemplates.deliveryReminder, {
      orderCode: input.orderCode,
      branchName: branch.branchName,
      deliveryTime: input.deliveryTimeStr,
      overdueMinutes,
      claimUrl: submitDeliveryUrl,
    })

    const sendRes = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: input.orderCode,
      messageText: text,
      claimUrl: submitDeliveryUrl,
      title: buildDispatchTitle({ emoji: "📸", action: "Nhắc bàn giao", level: "normal", orderCode: input.orderCode }),
      actions: [{ text: "Tải ảnh đã giao", url: submitDeliveryUrl }],
      imageUrl: input.productImageUrl,
    })

    if (sendRes.sent) {
      remindersSent["M4_DELIVERY"] = now.toISOString()
      results.push({ step: "M4_DELIVERY", triggered: true, sent: true, message: text })
    }
  }

  // 4b. Nhắc lần 2 (M4_DELIVERY_RETRY): Cách lần 1 đúng 5 phút nếu chi nhánh chưa phản hồi (tối đa 2 lần nhắc)
  const m4SentIso = remindersSent["M4_DELIVERY"]
  const m4SentReal = m4SentIso && !m4SentIso.startsWith("CANCELLED_")
  const m4RetrySentIso = remindersSent["M4_DELIVERY_RETRY"]
  if (m4SentReal && !isStepHandled(remindersSent, "M4_DELIVERY_RETRY") && !input.hasDeliveryProof && input.deliveryStatus !== "DELIVERED") {
    const m4SentTime = new Date(m4SentIso!).getTime()
    const minutesSinceM4 = Math.round((nowMs - m4SentTime) / (60 * 1000))
    const isRetryDue =
      input.forceStep === "M4_DELIVERY_RETRY" ||
      minutesSinceM4 >= policy.milestoneReminders.deliveryRetryIntervalMinutes

    if (isRetryDue) {
      const text = renderDispatchMessage(policy.messageTemplates.deliveryReminderSecond, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        deliveryTime: input.deliveryTimeStr,
        overdueMinutes,
        claimUrl: submitDeliveryUrl,
      })

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl: submitDeliveryUrl,
        title: buildDispatchTitle({ emoji: "⚠️", action: "Nhắc bàn giao", level: "retry", orderCode: input.orderCode }),
        actions: [{ text: "Tải ảnh ngay", url: submitDeliveryUrl }],
        imageUrl: input.productImageUrl,
      })

      if (sendRes.sent) {
        remindersSent["M4_DELIVERY_RETRY"] = now.toISOString()
        results.push({ step: "M4_DELIVERY_RETRY", triggered: true, sent: true, message: text })
      }
    }
  }

  // 4c. Báo động đỏ Điều phối (M4_DELIVERY_ESCALATION): Cách lần 2 đúng 5 phút nếu vẫn chưa có ảnh giao hàng
  const m4EscalateSentIso = remindersSent["M4_DELIVERY_ESCALATION"]
  const m4RetryReal = m4RetrySentIso && !m4RetrySentIso.startsWith("CANCELLED_")
  if (m4RetryReal && !isStepHandled(remindersSent, "M4_DELIVERY_ESCALATION") && !input.hasDeliveryProof && input.deliveryStatus !== "DELIVERED") {
    const m4RetrySentTime = new Date(m4RetrySentIso!).getTime()
    const minutesSinceRetry = Math.round((nowMs - m4RetrySentTime) / (60 * 1000))
    const isEscalateDue =
      input.forceStep === "M4_DELIVERY_ESCALATION" ||
      minutesSinceRetry >= policy.milestoneReminders.deliveryEscalateAfterMinutes

    if (isEscalateDue) {
      const branchPhone = branch.channels?.phone || branch.channels?.zaloPhone || "Chưa đăng ký SĐT"
      const text = renderDispatchMessage(policy.messageTemplates.deliveryEscalationAlert, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        deliveryTime: input.deliveryTimeStr,
        overdueMinutes,
        branchPhone,
        claimUrl: submitDeliveryUrl,
      })

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl: submitDeliveryUrl,
        title: buildDispatchTitle({ emoji: "🚨", action: "Nhắc bàn giao", level: "escalate", orderCode: input.orderCode }),
        actions: [
          { text: "Gọi chi nhánh", url: `tel:${branchPhone.replace(/\s+/g, "")}` },
          { text: "Xem đơn hàng", url: submitDeliveryUrl },
        ],
        imageUrl: input.productImageUrl,
      })

      if (sendRes.sent) {
        remindersSent["M4_DELIVERY_ESCALATION"] = now.toISOString()
        results.push({ step: "M4_DELIVERY_ESCALATION", triggered: true, sent: true, message: text })
      }
    }
  }

  return results
}
