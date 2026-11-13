/**
 * Use-case: Đánh giá và Gửi tin nhắn nhắc việc theo mốc tiến độ (M1 Chế tác, M2 QC, M3 Bàn giao Shipper, M4 Quá hạn).
 * Clean Architecture — Pure Logic kết hợp với IDispatchNotifier & ISubcontractStateStore.
 */

import { publicAppUrl } from "@/lib/public-url"
import type { TenantContext } from "@/core/tenancy"
import {
  parseChainDispatchPolicy,
  renderDispatchMessage,
  type ChainDispatchPolicy,
} from "../domain/chain-dispatch-policy"
import { buildDispatchTitle } from "../domain/dispatch-message-titles"
import type { SubcontractOrderState } from "../domain/subcontract-order"
import type { BranchCandidate } from "../domain/chain-dispatch-engine"
import type { IDispatchNotifier, ISubcontractStateStore } from "./dispatch-subcontract-order"
import { evaluateShipperMilestones } from "./dispatch-shipper-reminders"
import { evaluateDeliveryMilestones } from "./dispatch-delivery-reminders"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"

export type ReminderStep =
  | "M1_PREP"
  | "M2_QC"
  | "M2_QC_RETRY"
  | "M2_QC_ESCALATED"
  | "M3_SHIPPER"
  | "M3_SHIPPER_RETRY"
  | "M3_SHIPPER_ESCALATED"
  | "M3_DISPATCH"
  | "M4_DELIVERY"
  | "M4_DELIVERY_RETRY"
  | "M4_DELIVERY_ESCALATION"
  | "M4_OVERDUE"

export interface ProcessOrderReminderInput {
  orderId: string
  orderCode: string
  deliveryTimeStr: string
  deliveryDateStr?: string | null | undefined
  deliveryTimestampMs: number // Timestamp thời hạn giao hàng (UTC/Epoch ms)
  state: SubcontractOrderState
  branch: BranchCandidate
  shopSettings: unknown
  hasQcPhoto?: boolean | undefined
  hasShipperInfo?: boolean | undefined
  hasDeliveryProof?: boolean | undefined
  deliveryStatus?: string | undefined
  coordinatorChannel?: { phone?: string; telegramChatId?: string } | undefined
  baseUrl?: string | undefined
  forceStep?: ReminderStep | undefined
  productImageUrl?: string | null | undefined
}

export interface ReminderStepExecutionResult {
  step: ReminderStep
  triggered: boolean
  sent: boolean
  message?: string | undefined
}

/**
 * Kiểm tra xem một reminder step đã được xử lý (gửi thật hoặc bị cancel bởi Coordinator/Store).
 * First-Wins Mutex: cả "đã gửi thật" và "CANCELLED_BY_*" đều → skip.
 */
function isStepHandled(remindersSent: Record<string, string>, step: string): boolean {
  const val = remindersSent[step]
  return Boolean(val) // ISO timestamp (sent) hoặc "CANCELLED_BY_*" (cancelled) → đều truthy → skip
}

/**
 * Xử lý đánh giá và phát các tin nhắn nhắc việc theo mốc tiến độ kèm leo thang giám sát QC ảnh.
 * Chống gửi trùng thông qua trường remindersSent trong state.
 */
export async function processOrderDispatchReminders(
  ctx: TenantContext,
  input: ProcessOrderReminderInput,
  store: ISubcontractStateStore,
  notifier: IDispatchNotifier,
  now = new Date()
): Promise<ReminderStepExecutionResult[]> {
  const policy: ChainDispatchPolicy = parseChainDispatchPolicy(input.shopSettings)
  const state = input.state
  const branch = input.branch

  // Chỉ nhắc việc khi đơn đã ở trạng thái chính thức: COMMITTED hoặc CLAIMED_GRACE
  if (state.dispatchStatus !== "COMMITTED" && state.dispatchStatus !== "CLAIMED_GRACE") {
    return []
  }

  const results: ReminderStepExecutionResult[] = []
  const remindersSent: Record<string, string> = { ...(state.remindersSent ?? {}) }
  const nowMs = now.getTime()
  const deliveryMs = input.deliveryTimestampMs
  const minutesUntilDelivery = Math.round((deliveryMs - nowMs) / (60 * 1000))

  // Link đã ký theo chi nhánh; baseUrl là địa chỉ cấu hình (publicAppUrl)
  const link = { baseUrl: input.baseUrl || publicAppUrl(), organizationId: ctx.organizationId, orderCode: input.orderCode, branchId: branch.branchId }
  const linkFor = (action?: string) => subcontractBranchUrl({ ...link, action })
  const claimUrl = linkFor()
  const uploadQcUrl = linkFor("upload_qc")
  const submitShipperUrl = linkFor("submit_shipper")
  const submitDeliveryUrl = linkFor("submit_delivery")

  // Thẻ tiến độ của đơn = thẻ trong chat của CHÍNH chi nhánh đã nhận (gán lúc nhận đơn) — sửa thay vì gửi mới
  const existingCard =
    state.telegramMsgId && state.telegramChatId
      ? { msgId: state.telegramMsgId, chatId: state.telegramChatId, isCaption: state.isCaption ?? false }
      : null
  // Nếu lần này gửi lần đầu (chưa có thẻ), lưu msgId trả về vào state
  let capturedTelegramMsgId: string | null = null
  let capturedTelegramChatId: string | null = null
  let capturedIsCaption: boolean = false

  // 1. Mốc M1: Nhắc bắt đầu chế tác (ngay khi đơn chốt COMMITTED)
  const isPrepDue = input.forceStep
    ? input.forceStep === "M1_PREP"
    : Boolean(policy.milestoneReminders.prepAlert && state.dispatchStatus === "COMMITTED")
  if (isPrepDue && !isStepHandled(remindersSent, "M1_PREP")) {
    const text = renderDispatchMessage(policy.messageTemplates.prepReminder, {
      orderCode: input.orderCode,
      branchName: branch.branchName,
      deliveryTime: input.deliveryTimeStr,
      claimUrl,
    })

    const sendRes = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: input.orderCode,
      messageText: text,
      claimUrl,
      title: buildDispatchTitle({ emoji: "🔔", action: "Bắt đầu chế tác", level: "normal", orderCode: input.orderCode }),
      actions: [{ text: "Xem thẻ gia công", url: claimUrl }],
      imageUrl: input.productImageUrl,
      existingTelegramCard: existingCard,
    })

    if (sendRes.sent) {
      if (!existingCard && sendRes.telegramMsgId) {
        capturedTelegramMsgId = sendRes.telegramMsgId
        capturedTelegramChatId = sendRes.telegramChatId ?? null
        capturedIsCaption = sendRes.isCaption ?? false
      }
      remindersSent["M1_PREP"] = now.toISOString()
      results.push({ step: "M1_PREP", triggered: true, sent: true, message: text })
    }
  }


  // 2. Mốc M2: Nhắc chụp ảnh QC lần 1 (trước giờ giao X phút)
  const qcThresholdMinutes = policy.milestoneReminders.qcReminderMinutesBefore
  const isQcDue = input.forceStep
    ? input.forceStep === "M2_QC"
    : (qcThresholdMinutes > 0 &&
      minutesUntilDelivery <= qcThresholdMinutes &&
      minutesUntilDelivery > 0)
  if (isQcDue && !isStepHandled(remindersSent, "M2_QC") && !input.hasQcPhoto) {
    const text = renderDispatchMessage(policy.messageTemplates.qcReminder, {
      orderCode: input.orderCode,
      branchName: branch.branchName,
      deliveryTime: input.deliveryTimeStr,
      qcTime: `${qcThresholdMinutes} phút trước giờ giao`,
      claimUrl,
    })

    const sendRes = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: input.orderCode,
      messageText: text,
      claimUrl,
      title: buildDispatchTitle({ emoji: "📸", action: "Nhắc chụp ảnh thành phẩm", level: "normal", orderCode: input.orderCode }),
      actions: [{ text: "Chụp và tải ảnh thành phẩm", url: uploadQcUrl }],
      imageUrl: input.productImageUrl,
      existingTelegramCard: existingCard,
    })

    if (sendRes.sent) {
      if (!existingCard && sendRes.telegramMsgId) {
        capturedTelegramMsgId = sendRes.telegramMsgId
        capturedTelegramChatId = sendRes.telegramChatId ?? null
      }
      remindersSent["M2_QC"] = now.toISOString()
      results.push({ step: "M2_QC", triggered: true, sent: true, message: text })
    }
  }

  // 2b. Mốc M2_QC_RETRY: Nhắc chụp ảnh QC lần 2 (Sau N phút nếu cửa hàng chưa gửi ảnh)
  // First-Wins: chỉ retry nếu lần 1 đã gửi THẬT (ISO timestamp), không retry nếu bị CANCELLED
  const m2SentIso = remindersSent["M2_QC"]
  const m2SentReal = m2SentIso && !m2SentIso.startsWith("CANCELLED_")
  const m2RetrySentIso = remindersSent["M2_QC_RETRY"]
  if (m2SentReal && !isStepHandled(remindersSent, "M2_QC_RETRY") && !input.hasQcPhoto) {
    const m2SentTime = new Date(m2SentIso).getTime()
    const minutesSinceM2 = Math.round((nowMs - m2SentTime) / (60 * 1000))
    const isRetryDue = input.forceStep
      ? input.forceStep === "M2_QC_RETRY"
      : minutesSinceM2 >= policy.milestoneReminders.qcRetryIntervalMinutes

    if (isRetryDue) {
      const text = renderDispatchMessage(policy.messageTemplates.qcReminderSecond, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        deliveryTime: input.deliveryTimeStr,
        claimUrl,
      })

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl,
        title: buildDispatchTitle({ emoji: "⚠️", action: "Nhắc chụp ảnh thành phẩm", level: "retry", orderCode: input.orderCode }),
        actions: [{ text: "Tải ảnh thành phẩm ngay", url: uploadQcUrl }],
        imageUrl: input.productImageUrl,
        existingTelegramCard: existingCard,
      })

      if (sendRes.sent) {
        if (!existingCard && sendRes.telegramMsgId) {
          capturedTelegramMsgId = sendRes.telegramMsgId
          capturedTelegramChatId = sendRes.telegramChatId ?? null
        }
        remindersSent["M2_QC_RETRY"] = now.toISOString()
        results.push({ step: "M2_QC_RETRY", triggered: true, sent: true, message: text })
      }
    }
  }

  // 2c. Mốc M2_QC_ESCALATED: Báo động Điều phối viên (Sau lần 2 thêm M phút nếu vẫn chưa có ảnh)
  const m2EscalatedIso = remindersSent["M2_QC_ESCALATED"]
  const m2RetryReal = m2RetrySentIso && !m2RetrySentIso.startsWith("CANCELLED_")
  if (m2RetryReal && !isStepHandled(remindersSent, "M2_QC_ESCALATED") && !input.hasQcPhoto) {
    const retrySentTime = new Date(m2RetrySentIso!).getTime()
    const minutesSinceRetry = Math.round((nowMs - retrySentTime) / (60 * 1000))
    const isEscalateDue = input.forceStep
      ? input.forceStep === "M2_QC_ESCALATED"
      : minutesSinceRetry >= policy.milestoneReminders.qcEscalateAfterMinutes

    if (isEscalateDue) {
      const branchPhone = branch.channels?.phone ?? "Chưa cấu hình SĐT"
      const text = renderDispatchMessage(policy.messageTemplates.qcEscalationAlert, {
        orderCode: input.orderCode,
        branchName: branch.branchName,
        branchPhone,
        deliveryTime: input.deliveryTimeStr,
        claimUrl,
      })

      // Gửi cảnh báo đến Điều phối (hoặc kênh chi nhánh phụ trách)
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
        { text: "Xem chi tiết đơn", url: claimUrl },
      ]

      const sendRes = await notifier.sendSubcontractInvite(ctx, {
        branch: targetBranch,
        orderCode: input.orderCode,
        messageText: text,
        claimUrl,
        title: buildDispatchTitle({ emoji: "🚨", action: "Nhắc chụp ảnh thành phẩm", level: "escalate", orderCode: input.orderCode }),
        actions: escalationActions,
        imageUrl: input.productImageUrl,
        existingTelegramCard: existingCard,
      })

      if (sendRes.sent) {
        if (!existingCard && sendRes.telegramMsgId) {
          capturedTelegramMsgId = sendRes.telegramMsgId
          capturedTelegramChatId = sendRes.telegramChatId ?? null
        }
        remindersSent["M2_QC_ESCALATED"] = now.toISOString()
        results.push({ step: "M2_QC_ESCALATED", triggered: true, sent: true, message: text })
      }
    }
  }

  // 3. Mốc M3: Nhắc cung cấp thông tin Shipper trước giờ giao N phút (Lần 1, Lần 2, Báo động đỏ Điều phối)
  const shipperResults = await evaluateShipperMilestones({
    ctx,
    input,
    policy,
    branch,
    remindersSent,
    minutesUntilDelivery,
    submitShipperUrl,
    notifier,
    now,
  })
  results.push(...shipperResults)

  // 4. Mốc M4: Nhắc hoàn thành giao hàng & tải ảnh POD (Lần 1, Lần 2, Báo động đỏ Điều phối)
  const deliveryResults = await evaluateDeliveryMilestones({
    ctx,
    input,
    policy,
    branch,
    remindersSent,
    minutesUntilDelivery,
    submitDeliveryUrl,
    notifier,
    now,
  })
  results.push(...deliveryResults)

  // 5. Cảnh báo quá hạn (Overdue Alert)
  const overdueThreshold = policy.milestoneReminders.overdueWarningMinutes
  const isOverdueDue = input.forceStep
    ? input.forceStep === "M4_OVERDUE"
    : minutesUntilDelivery < -overdueThreshold
  if (isOverdueDue && !isStepHandled(remindersSent, "M4_OVERDUE")) {
    const text = renderDispatchMessage(policy.messageTemplates.overdueAlert, {
      orderCode: input.orderCode,
      branchName: branch.branchName,
      overdueMinutes: Math.abs(minutesUntilDelivery),
      claimUrl,
    })

    const sendRes = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: input.orderCode,
      messageText: text,
      claimUrl,
      title: buildDispatchTitle({ emoji: "⚠️", action: "Quá hạn xử lý", level: "normal", orderCode: input.orderCode }),
      actions: [{ text: "Xem đơn trễ hạn", url: claimUrl }],
      existingTelegramCard: existingCard,
    })

    if (sendRes.sent) {
      if (!existingCard && sendRes.telegramMsgId) {
        capturedTelegramMsgId = sendRes.telegramMsgId
        capturedTelegramChatId = sendRes.telegramChatId ?? null
        capturedIsCaption = sendRes.isCaption ?? false
      }
      remindersSent["M4_OVERDUE"] = now.toISOString()
      results.push({ step: "M4_OVERDUE", triggered: true, sent: true, message: text })
    }
  }

  // Gộp các mốc vừa gửi vào trạng thái MỚI NHẤT dưới khoá dòng — không ghi đè bản chụp đầu lượt
  // quét lên thao tác chốt/huỷ xảy ra trong lúc gửi tin (rà soát cụm G)
  if (results.some((r) => r.sent)) {
    await store.updateSubcontractState(ctx, state.orderId, (current) => {
      const base = current ?? state
      const merged: SubcontractOrderState = {
        ...base,
        remindersSent: { ...(base.remindersSent ?? {}), ...remindersSent },
        ...(capturedTelegramMsgId && base.claimedBranchId === branch.branchId
          ? { telegramMsgId: capturedTelegramMsgId, telegramChatId: capturedTelegramChatId, isCaption: capturedIsCaption }
          : {}),
      }
      return { next: merged, result: undefined }
    })
  }

  return results
}
