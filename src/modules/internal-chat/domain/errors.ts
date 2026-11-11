import { AppError, type ErrorCode } from "@/core/http/errors"

/**
 * Lỗi miền chat nội bộ — kế thừa AppError để route trả đúng mã HTTP (trước đây rơi vào 500).
 * Không phải thành viên / cuộc hội thoại của tổ chức khác → 404, không lộ là cuộc hội thoại tồn tại.
 */
export class ChatDomainError extends AppError {
  constructor(message: string, httpCode: ErrorCode, public readonly chatCode: string) {
    super(httpCode, message)
    this.name = "ChatDomainError"
  }
}

export class ConversationNotFoundError extends ChatDomainError {
  constructor(conversationId: string) {
    super(`Không tìm thấy cuộc hội thoại ID: ${conversationId}`, "NOT_FOUND", "CONVERSATION_NOT_FOUND")
  }
}

export class ChatAccessDeniedError extends ChatDomainError {
  constructor(reason = "Không tìm thấy cuộc hội thoại") {
    super(reason, "NOT_FOUND", "CHAT_ACCESS_DENIED")
  }
}

export class InvalidMessageContentError extends ChatDomainError {
  constructor(reason = "Nội dung tin nhắn không hợp lệ") {
    super(reason, "VALIDATION_FAILED", "INVALID_MESSAGE_CONTENT")
  }
}

/** Thẻ đã được xử lý (nhận / từ chối) hoặc vừa bị người khác xử lý trước — 409. */
export class CardActionConflictError extends ChatDomainError {
  constructor(reason = "Thẻ này đã được xử lý") {
    super(reason, "CONFLICT", "CARD_ALREADY_HANDLED")
  }
}

export class ChatImageTooLargeError extends ChatDomainError {
  constructor(reason = "Mỗi ảnh tối đa 10 MB") {
    super(reason, "PAYLOAD_TOO_LARGE", "CHAT_IMAGE_TOO_LARGE")
  }
}

/** Tin không đổi được nữa (quá 24 giờ, đã thu hồi, thẻ / tin hệ thống) — 409. */
export class MessageChangeNotAllowedError extends ChatDomainError {
  constructor(reason = "Tin này không sửa hoặc thu hồi được nữa") {
    super(reason, "CONFLICT", "MESSAGE_CHANGE_NOT_ALLOWED")
  }
}
