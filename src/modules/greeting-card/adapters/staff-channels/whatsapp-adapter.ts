import { log } from "@/core/observability/log"
import { toInternationalPhone } from "../../domain/customer-notifications"
import type {
  ChannelSendResult,
  IStaffNotificationProvider,
  StaffChannelMessage,
} from "./channel-provider.interface"

export class WhatsAppStaffAdapter implements IStaffNotificationProvider {
  readonly channel = "WHATSAPP" as const

  async sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult> {
    const config = msg.channelConfig as { accessToken?: string; phoneNumberId?: string } | undefined
    const accessToken = config?.accessToken
    const phoneNumberId = config?.phoneNumberId

    if (!accessToken || !phoneNumberId) {
      return { sent: false, error: "Chưa cấu hình WhatsApp Cloud API (Token hoặc Phone ID)" }
    }

    const phone = toInternationalPhone(msg.recipientPhone)
    if (!phone) {
      return { sent: false, error: `Nhân viên ${msg.recipientName} chưa có SĐT hợp lệ` }
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000), // không treo tiến trình nền khi nhà cung cấp chậm
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: `*${msg.title}*\n\n${msg.message}` },
        }),
      })

      const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } }
      if (data.error) {
        log.warn("staff_notify.whatsapp_failed", { error: data.error.message })
        return { sent: false, error: data.error.message }
      }

      return { sent: true, providerMsgId: data.messages?.[0]?.id ?? null }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("staff_notify.whatsapp_exception", { error: errMsg })
      return { sent: false, error: errMsg }
    }
  }
}
