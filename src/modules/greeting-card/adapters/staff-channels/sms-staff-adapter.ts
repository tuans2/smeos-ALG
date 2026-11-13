import { log } from "@/core/observability/log"
import { toInternationalPhone } from "../../domain/customer-notifications"
import { sendEsmsMessage, type EsmsCredentials } from "../esms-adapter"
import type {
  ChannelSendResult,
  IStaffNotificationProvider,
  StaffChannelMessage,
} from "./channel-provider.interface"

export class SmsStaffAdapter implements IStaffNotificationProvider {
  readonly channel = "SMS" as const

  async sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult> {
    const creds = msg.channelConfig as EsmsCredentials | undefined
    if (!creds?.apiKey || !creds.secretKey) {
      return { sent: false, error: "Chưa cấu hình tài khoản SMS (eSMS)" }
    }

    const phone = toInternationalPhone(msg.recipientPhone)
    if (!phone) {
      return { sent: false, error: `Nhân viên ${msg.recipientName} chưa có SĐT hợp lệ` }
    }

    try {
      const content = `${msg.title}: ${msg.message}`.slice(0, 300)
      const res = await sendEsmsMessage({
        creds,
        phone,
        content,
        requestId: `staff-${Date.now()}`,
      })

      return { sent: true, providerMsgId: res.messageId }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("staff_notify.sms_exception", { error: errMsg })
      return { sent: false, error: errMsg }
    }
  }
}
