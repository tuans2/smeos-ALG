/**
 * dispatch-shipper-reminders.ts
 *
 * Xử lý đánh giá và phát các tin nhắn nhắc việc Shipper (M3) theo 3 cấp độ:
 * - Lần 1: Nhắc cung cấp Họ tên & SĐT Shipper trước giờ giao N phút
 * - Lần 2: Giục khẩn cấp sau 5 phút nếu chưa có phản hồi (tối đa 2 lần nhắc)
 * - Báo động đỏ: Gửi cảnh báo đỏ tới Điều phối viên kèm hotline gọi trực tiếp nếu sau 5 phút nữa vẫn chưa có Shipper.
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

export interface ShipperMilestoneParams {
  ctx: TenantContext
  input: ProcessOrderReminderInput
  policy: ChainDispatchPolicy
  branch: BranchCandidate
  remindersSent: Record<string, string>
  minutesUntilDelivery: number
  submitShipperUrl: string
  notifier: IDispatchNotifier
  now: Date
}

export async function evaluateShipperMilestones({
  ctx,
  input,
  policy,
  branch,
  remindersSent,
  minutesUntilDelivery,
  submitShipperUrl,
  notifier,
  now,
}: ShipperMilestoneParams): Promise<ReminderStepExecutionResult[]> {
  const results: ReminderStepExecutionResult[] = []
  const nowMs = now.getTime()

  // 3. Mốc M3: Nhắc cung cấp thông tin Shipper trước giờ giao N phút
  const dispatchThresholdMinutes = policy.milestoneReminders.dispatchReminderMinutesBefore
  const isShipperDue =
    input.forceStep === "M3_SHIPPER" ||
    input.forceStep === "M3_DISPATCH" ||
    (dispatchThresholdMinutes > 0 &&
      minutesUntilDelivery <= dispatchThresholdMinutes &&
      minutesUntilDelivery > 0 &&
      input.hasQcPhoto !== false)

  // 3a. Nhắc lần 1 (M3_SHIPPER): Kích hoạt khi đến mốc N phút và cửa hàng chưa có thông tin shipper
  if (isShipperDue && !isStepHandled(remindersSent, "M3_SHIPPER") && !input.hasShipperInfo) {
    const text = renderDispatchMessage(policy.messageTemplates.shipperReminder, {
      orderCode: input.orderCode,
      branchName: branch.branchName,
      deliveryTime: input.deliveryTimeStr,
      minutesUntilDelivery,
      claimUrl: submitShipperUrl,
    })

    const sendRes = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: input.orderCode,
      messageText: text,
      claimUrl: submitShipperUrl,
      title: buildDispatchTitle({ emoji: "🛵", action: "Cần thông tin shipper", level: "normal", orderCode: input.orderCode }),
      actions: [{ text: "Nhập thông tin shipper", url: submitShipperUrl }],
      imageUrl: input.productImageUrl,
    })

    if (sendRes.sent) {
      remindersSent["M3_SHIPPER"] = now.toISOString()
      results.push({ step: "M3_SHIPPER", triggered: true, sent: true, message: text })
    }
  }

  // 3b. Nhắc lần 2 (M3_SHIPPER_RETRY): Cách lần 1 đúng 5 phút nếu cửa hàng chưa phản hồi (tối đa 2 lần nhắc)
  const m3SentIso = remindersSent["M3_SHIPPER"]
  const m3SentReal = m3SentIso && !m3SentIso.startsWith("CANCELLED_")
  const m3RetrySentIso = remindersSent["M3_SHIPPER_RETRY"]
  if (m3SentReal && !isStepHandled(remindersSent, "M3_SHIPPER_RETRY") && !input.hasShipperInfo) {
    const m3SentTime = new Date(m3SentIso!).getTime()
    const minutesSinceM3 = Math.round((nowMs - m3SentTime) / (60 * 1000))
    const isRetryDue =
      input.forceStep === "M3_SHIPPER_RETRY" ||
      minutesSinceM3 >= policy.milestoneReminders.shipperRetryIntervalMinutes

    if (isRetryDue) {
      const text = renderDispatchMessage(policy.messageTemplates.shipperReminderSecond, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        deliveryTime: input.deliveryTimeStr,
        minutesUntilDelivery,
        claimUrl: submitShipperUrl,
      })

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl: submitShipperUrl,
        title: buildDispatchTitle({ emoji: "⚠️", action: "Cần thông tin shipper", level: "retry", orderCode: input.orderCode }),
        actions: [{ text: "Nhập thông tin shipper ngay", url: submitShipperUrl }],
        imageUrl: input.productImageUrl,
      })

      if (sendRes.sent) {
        remindersSent["M3_SHIPPER_RETRY"] = now.toISOString()
        results.push({ step: "M3_SHIPPER_RETRY", triggered: true, sent: true, message: text })
      }
    }
  }

  // 3c. Báo động đỏ Điều phối viên (M3_SHIPPER_ESCALATED): Sau lần 2 đúng 5 phút nếu vẫn không nhận được phản hồi
  const m3EscalatedIso = remindersSent["M3_SHIPPER_ESCALATED"]
  const m3RetryReal = m3RetrySentIso && !m3RetrySentIso.startsWith("CANCELLED_")
  if (m3RetryReal && !isStepHandled(remindersSent, "M3_SHIPPER_ESCALATED") && !input.hasShipperInfo) {
    const retrySentTime = new Date(m3RetrySentIso!).getTime()
    const minutesSinceRetry = Math.round((nowMs - retrySentTime) / (60 * 1000))
    const isEscalateDue =
      input.forceStep === "M3_SHIPPER_ESCALATED" ||
      minutesSinceRetry >= policy.milestoneReminders.shipperEscalateAfterMinutes

    if (isEscalateDue) {
      const branchPhone = branch.channels?.phone ?? "Chưa cấu hình SĐT"
      const text = renderDispatchMessage(policy.messageTemplates.shipperEscalationAlert, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        branchPhone,
        deliveryTime: input.deliveryTimeStr,
        minutesUntilDelivery,
        claimUrl: submitShipperUrl,
      })

      // Gửi cảnh báo đỏ tới kênh Điều phối viên
      const targetBranch: BranchCandidate = input.coordinatorChannel?.telegramChatId
        ? {
            ...branch,
            channels: {
              ...branch.channels,
              telegramChatId: input.coordinatorChannel.telegramChatId,
            },
          }
        : branch

      const escalationActions = [
        ...(branch.channels?.phone ? [{ text: `Gọi chi nhánh: ${branch.channels.phone}`, url: `tel:${branch.channels.phone}` }] : []),
        { text: "Xem chi tiết đơn / Điền hộ", url: submitShipperUrl },
      ]

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch: targetBranch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl: submitShipperUrl,
        title: buildDispatchTitle({ emoji: "🚨", action: "Cần thông tin shipper", level: "escalate", orderCode: input.orderCode }),
        actions: escalationActions,
        imageUrl: input.productImageUrl,
      })

      if (sendRes.sent) {
        remindersSent["M3_SHIPPER_ESCALATED"] = now.toISOString()
        results.push({ step: "M3_SHIPPER_ESCALATED", triggered: true, sent: true, message: text })
      }
    }
  }

  return results
}
