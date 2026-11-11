/** Giới hạn nội dung chat nội bộ — dùng chung cho route (zod) và use-case. */
export const CHAT_MESSAGE_MAX_LENGTH = 4000
export const CARD_REJECT_REASON_MAX_LENGTH = 500
export const CHAT_PAGE_DEFAULT_LIMIT = 50
export const CHAT_PAGE_MAX_LIMIT = 100

/** Loại phòng client được tự tạo. `PLATFORM_TENANT` (Nền tảng ↔ khách) ngoài phạm vi, chỉ máy chủ tạo. */
export const CLIENT_CREATABLE_CONVERSATION_TYPES = ["CHAIN_PARTNER", "ORDER_THREAD"] as const
