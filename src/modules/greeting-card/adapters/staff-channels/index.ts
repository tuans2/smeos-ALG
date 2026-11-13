import type { StaffNotifyChannel } from "../../domain/staff-notification-types"
import type { IStaffNotificationProvider } from "./channel-provider.interface"
import { MessengerStaffAdapter } from "./messenger-adapter"
import { SmsStaffAdapter } from "./sms-staff-adapter"
import { TelegramStaffAdapter } from "./telegram-adapter"
import { WhatsAppStaffAdapter } from "./whatsapp-adapter"
import { ZaloOaStaffAdapter } from "./zalo-oa-staff-adapter"

export * from "./channel-provider.interface"
export * from "./telegram-adapter"
export * from "./zalo-oa-staff-adapter"
export * from "./sms-staff-adapter"
export * from "./whatsapp-adapter"
export * from "./messenger-adapter"

const providers: Record<string, IStaffNotificationProvider> = {
  TELEGRAM: new TelegramStaffAdapter(),
  ZALO: new ZaloOaStaffAdapter(),
  SMS: new SmsStaffAdapter(),
  WHATSAPP: new WhatsAppStaffAdapter(),
  MESSENGER: new MessengerStaffAdapter(),
}

export function getStaffChannelProvider(channel: StaffNotifyChannel): IStaffNotificationProvider | null {
  return providers[channel] ?? null
}
