import { log } from "@/core/observability/log"
import type {
  ChannelSendResult,
  IStaffNotificationProvider,
  StaffChannelMessage,
} from "./channel-provider.interface"

export class MessengerStaffAdapter implements IStaffNotificationProvider {
  readonly channel = "MESSENGER" as const

  async sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult> {
    const config = msg.channelConfig as { pageAccessToken?: string; userPsidMap?: Record<string, string> } | undefined
    const pageAccessToken = config?.pageAccessToken
    const psid = config?.userPsidMap?.[msg.recipientId]

    if (!pageAccessToken) {
      return { sent: false, error: "Chưa cấu hình Facebook Page Access Token" }
    }

    if (!psid) {
      return {
        sent: false,
        error: `Nhân viên ${msg.recipientName} chưa kết nối Facebook Messenger với Fanpage tiệm`,
      }
    }

    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000), // không treo tiến trình nền khi nhà cung cấp chậm
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: psid },
          message: { text: `${msg.title}\n\n${msg.message}` },
        }),
      })

      const data = (await res.json()) as { message_id?: string; error?: { message: string } }
      if (data.error) {
        log.warn("staff_notify.messenger_failed", { error: data.error.message })
        return { sent: false, error: data.error.message }
      }

      return { sent: true, providerMsgId: data.message_id ?? null }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("staff_notify.messenger_exception", { error: errMsg })
      return { sent: false, error: errMsg }
    }
  }
}
