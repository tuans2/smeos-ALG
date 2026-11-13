/**
 * NOTIFICATION CHANNEL ADAPTER INTERFACE
 *
 * Định nghĩa hợp đồng cho mỗi kênh phát tán (Channel Adapter).
 * Mỗi kênh triển khai độc lập, xử lý định dạng tin và gửi tới provider ngoài.
 *
 * @module notification/infra/channel-adapters
 */
import type { NotifyChannel } from "../../domain/events/_contract"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"

export interface INotificationChannelAdapter {
  readonly channel: NotifyChannel
  send(payload: NotificationPayload): Promise<ChannelSendResult>
}

/** Kênh chưa có nhà cung cấp thật: trả lỗi này thay vì báo gửi thành công giả. */
export const NOT_CONFIGURED_ERROR = "NOT_CONFIGURED"
