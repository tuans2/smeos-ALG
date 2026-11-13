/**
 * CHANNEL ADAPTERS REGISTRY
 *
 * Quản lý và cung cấp adapter phù hợp cho từng kênh thông báo.
 *
 * @module notification/infra/channel-adapters
 */
import type { NotifyChannel } from "../../domain/events/_contract"
import type { INotificationChannelAdapter } from "./_channel-adapter.interface"
import { AppInboxAdapter } from "./app-inbox-adapter"
import { TelegramNotificationAdapter } from "./telegram-adapter"
import { EmailNotificationAdapter } from "./email-adapter"
import { WebPushNotificationAdapter } from "./web-push-adapter"
import { ZaloNotificationAdapter } from "./zalo-adapter"
import { SmsNotificationAdapter } from "./sms-adapter"

const adapters: Record<string, INotificationChannelAdapter> = {
  APP_INBOX: new AppInboxAdapter(),
  TELEGRAM: new TelegramNotificationAdapter(),
  EMAIL: new EmailNotificationAdapter(),
  PUSH: new WebPushNotificationAdapter(),
  ZALO: new ZaloNotificationAdapter(),
  SMS: new SmsNotificationAdapter(),
}

export function getChannelAdapter(channel: NotifyChannel): INotificationChannelAdapter | null {
  return adapters[channel] ?? null
}

export {
  type INotificationChannelAdapter,
  AppInboxAdapter,
  TelegramNotificationAdapter,
  EmailNotificationAdapter,
  WebPushNotificationAdapter,
  ZaloNotificationAdapter,
  SmsNotificationAdapter,
}
