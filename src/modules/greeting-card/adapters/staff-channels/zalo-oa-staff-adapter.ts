import { log } from "@/core/observability/log"
import type {
  ChannelSendResult,
  IStaffNotificationProvider,
  StaffChannelMessage,
} from "./channel-provider.interface"

export class ZaloOaStaffAdapter implements IStaffNotificationProvider {
  readonly channel = "ZALO" as const

  async sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult> {
    const config = msg.channelConfig as { accessToken?: string; zaloUserMap?: Record<string, string> } | undefined
    const accessToken = config?.accessToken
    const zaloUserId = config?.zaloUserMap?.[msg.recipientId]

    if (!accessToken) {
      return { sent: false, error: "Chưa cấu hình Zalo OA Access Token" }
    }

    if (!zaloUserId) {
      // Chưa liên kết Zalo ID của nhân viên cụ thể
      return {
        sent: false,
        error: `Nhân viên ${msg.recipientName} chưa liên kết tài khoản Zalo với cửa hàng`,
      }
    }

    try {
      const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
        method: "POST",
        signal: AbortSignal.timeout(10_000), // không treo tiến trình nền khi nhà cung cấp chậm
        headers: {
          "Content-Type": "application/json",
          access_token: accessToken,
        },
        body: JSON.stringify({
          recipient: { user_id: zaloUserId },
          message: { text: `${msg.title}\n\n${msg.message}` },
        }),
      })

      const data = (await res.json()) as { error: number; message: string; data?: { message_id: string } }
      if (data.error !== 0) {
        log.warn("staff_notify.zalo_failed", { error: data.message })
        return { sent: false, error: data.message }
      }

      return { sent: true, providerMsgId: data.data?.message_id ?? null }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("staff_notify.zalo_exception", { error: errMsg })
      return { sent: false, error: errMsg }
    }
  }
}
