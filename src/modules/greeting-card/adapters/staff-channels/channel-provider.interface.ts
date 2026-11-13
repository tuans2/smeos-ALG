import type { StaffNotifyChannel } from "../../domain/staff-notification-types"

export interface StaffChannelAction {
  text: string
  url: string
}

export interface StaffChannelMessage {
  recipientId: string
  recipientName: string
  recipientPhone: string | null
  title: string
  message: string
  imageUrl?: string | null | undefined
  channelConfig?: Record<string, unknown>
  actions?: StaffChannelAction[]
}

/** Payload dùng để EDIT một tin nhắn đã gửi trước (Live Dashboard Card) */
export interface EditMessagePayload {
  /** Message ID đã lưu từ lần gửi đầu */
  messageId: string
  /** Chat ID nơi tin nhắn đang tồn tại */
  chatId: string
  /** Nội dung mới (caption nếu là nhắn bằng ảnh, text nếu gửi text) */
  text: string
  /** Có phải là caption của ảnh không (dùng editMessageCaption thay vì editMessageText) */
  isCaption?: boolean
  actions?: StaffChannelAction[]
  channelConfig?: Record<string, unknown>
}

export interface ChannelSendResult {
  sent: boolean
  providerMsgId?: string | null
  /** Chat ID đã gửi — cần lưu để edit sau */
  providerChatId?: string | null
  /** Đã gửi dạng caption của ảnh hay text thuần */
  isCaption?: boolean
  error?: string | null
}

export interface IStaffNotificationProvider {
  readonly channel: StaffNotifyChannel
  sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult>
  /** Cập nhật nội dung một tin nhắn đã gửi (Live Dashboard Card). Trả về false nếu không hỗ trợ. */
  editMessage?(payload: EditMessagePayload): Promise<{ ok: boolean; error?: string | undefined }>
}
