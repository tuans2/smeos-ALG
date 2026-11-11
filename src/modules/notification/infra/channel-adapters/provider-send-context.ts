import { publicAppUrl } from "@/lib/public-url"
import { safeHttpLink } from "../../domain/notification-text"
import type { NotificationPayload } from "../../domain/notification-payload"

/** Link tuyệt đối cho kênh ngoài (SMS, Zalo): deep link tương đối ghép với địa chỉ ứng dụng. */
export function absoluteDeepLink(payload: NotificationPayload): string | null {
  if (!payload.deepLink) return null
  return safeHttpLink(payload.deepLink.startsWith("http") ? payload.deepLink : `${publicAppUrl()}${payload.deepLink}`)
}

/** Mã đối soát gửi kèm nhà cung cấp — không chứa dữ liệu người nhận. */
export function providerRequestId(payload: NotificationPayload): string {
  return `${payload.eventKey}:${payload.recipient.userId}:${Date.now()}`.slice(0, 100)
}
