import { log } from "@/core/observability/log"
import { runInBackground } from "@/core/runtime/background"
import { openSecret } from "@/core/security/secret-box"
import { getStaffChannelProvider } from "../adapters/staff-channels"
import { resolveStaffNotificationTargets } from "../domain/staff-notification-matrix"
import type {
  StaffNotificationContext,
  StaffNotifyChannel,
  StaffNotifyEvent,
} from "../domain/staff-notification-types"
import { StaffNotificationRepository, getStaffNotificationRepository } from "../infra/staff-notification-repository"

export const STAFF_NOTIFY_SECRET_PURPOSE = "greeting-card-staff-notify"

export interface StaffNotifySummary {
  event: StaffNotifyEvent
  totalRecipients: number
  deliveredCount: number
  failedCount: number
}

/**
 * Điều phối gửi thông báo nội bộ cho nhân viên theo Ma Trận Vai Trò (Staff Notification Matrix).
 * Không bao giờ ném lỗi ra ngoài — thông báo là tiến trình phụ, không được ngắt thao tác chính.
 */
export async function notifyStaffEvent(
  organizationId: string,
  event: StaffNotifyEvent,
  ctx: StaffNotificationContext,
  repo = getStaffNotificationRepository()
): Promise<StaffNotifySummary> {
  const summary: StaffNotifySummary = {
    event,
    totalRecipients: 0,
    deliveredCount: 0,
    failedCount: 0,
  }

  try {
    // 1. Kiểm tra quyền kênh được SaaS cấp phép & cấu hình tiệm
    const saasAllowed = await repo.getSaasAllowedChannels(organizationId)
    const saasAllowedSet = new Set<StaffNotifyChannel>(saasAllowed)

    const shopConfig = await repo.getShopStaffNotificationConfig(organizationId)
    const isShopEnabled = shopConfig?.staffNotifyEnabled ?? false

    // Lọc kênh hiệu lực: SaaS cho phép VÀ Tiệm đã bật (APP_INBOX luôn bật)
    const activeChannels = new Set<StaffNotifyChannel>(["APP_INBOX"])
    if (isShopEnabled && shopConfig?.staffNotifyChannels) {
      for (const ch of shopConfig.staffNotifyChannels) {
        if (saasAllowedSet.has(ch)) {
          activeChannels.add(ch)
        }
      }
    }

    // Nếu tiệm tắt riêng sự kiện này thì chỉ giữ lại APP_INBOX
    if (shopConfig?.staffNotifyEvents && shopConfig.staffNotifyEvents[event] === false) {
      activeChannels.clear()
      activeChannels.add("APP_INBOX")
    }

    // 2. Giải quyết danh sách vai trò và mục tiêu cần nhận từ Matrix SSOT
    const resolvedTargets = resolveStaffNotificationTargets(event, ctx, activeChannels)
    if (resolvedTargets.length === 0) return summary

    // Giải mã cấu hình kết nối các kênh ngoài nếu có
    let decryptedChannelConfigs: Record<string, unknown> = {}
    if (shopConfig?.staffNotifyConfigEncrypted) {
      try {
        const raw = openSecret(shopConfig.staffNotifyConfigEncrypted, STAFF_NOTIFY_SECRET_PURPOSE)
        decryptedChannelConfigs = JSON.parse(raw) as Record<string, unknown>
      } catch (err) {
        log.warn("staff_notify.decrypt_config_failed", { organizationId, error: String(err) })
      }
    }

    // 3. Phân phối tới từng nhân viên
    for (const target of resolvedTargets) {
      const members = await repo.findRecipientsByRole(organizationId, target.role, target.recipientUserId)

      for (const member of members) {
        summary.totalRecipients += 1

        for (const channel of target.channels) {
          if (channel === "APP_INBOX") {
            // Ghi nhận sự kiện vào nhật ký Hộp Việc
            await repo.recordStaffNotification({
              organizationId,
              orderId: ctx.orderId ?? null,
              eventKey: event,
              channel: "APP_INBOX",
              recipientRole: target.role,
              recipientId: member.userId,
              recipientInfo: member.email,
              title: target.title,
              message: target.message,
              status: "SENT",
            })
            summary.deliveredCount += 1
            continue
          }

          // Các kênh push ngoài (TELEGRAM, ZALO, SMS, WHATSAPP, MESSENGER)
          const provider = getStaffChannelProvider(channel)
          if (!provider) continue

          const channelSpecificConfig = (decryptedChannelConfigs[channel] as Record<string, unknown>) || decryptedChannelConfigs
          const sendResult = await provider.sendMessage({
            recipientId: member.userId,
            recipientName: member.name,
            recipientPhone: member.phone,
            title: target.title,
            message: target.message,
            channelConfig: channelSpecificConfig,
          })

          await repo.recordStaffNotification({
            organizationId,
            orderId: ctx.orderId ?? null,
            eventKey: event,
            channel,
            recipientRole: target.role,
            recipientId: member.userId,
            recipientInfo: member.phone || member.email,
            title: target.title,
            message: target.message,
            status: sendResult.sent ? "SENT" : "FAILED",
            providerMsgId: sendResult.providerMsgId ?? null,
            error: sendResult.error ?? null,
          })

          if (sendResult.sent) {
            summary.deliveredCount += 1
          } else {
            summary.failedCount += 1
          }
        }
      }
    }

    return summary
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error("staff_notify.orchestration_failed", { organizationId, event, error: message })
    return summary
  }
}

/**
 * Đẩy thông báo nhân viên vào hàng đợi nền — đảm bảo độ trễ thấp và không làm chậm request chính.
 */
export function queueStaffNotification(
  organizationId: string,
  event: StaffNotifyEvent,
  ctx: StaffNotificationContext
): void {
  runInBackground(`staff_notify:${event}:${ctx.orderCode || ctx.orderId || "event"}`, () =>
    notifyStaffEvent(organizationId, event, ctx)
  )
}
