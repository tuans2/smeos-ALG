import type { StorageProvider } from "@/core/ports/storage-provider"
import { isRoomImageKey } from "../domain/chat-image"
import type { MessagePageDecorator } from "../use-cases/get-conversation-messages"

/** URL ảnh chat sống 1 giờ — trang hỏi lại 5 giây/lần giữ nguyên ảnh đã tải, không tải lại theo URL mới. */
export const CHAT_IMAGE_URL_TTL_SECONDS = 3600

/**
 * Thay khoá kho của tin ảnh bằng URL ký có hạn (chỉ phương thức GET). Chỉ ký khoá nằm đúng thư mục ảnh của phòng
 * đang đọc — khoá lạ (dữ liệu hỏng, chép từ phòng khác) bị bỏ, không lộ tệp ngoài phòng. Chạy sau khi đã kiểm quyền.
 */
export function chatImageDecorator(storage: Pick<StorageProvider, "signedUrl">): MessagePageDecorator {
  return async (items, conversation) => {
    if (!items.some((m) => m.messageType === "IMAGE")) return items
    return Promise.all(
      items.map(async (m) => {
        if (m.messageType !== "IMAGE") return m
        const keys = m.attachments.filter((k) => isRoomImageKey(k, conversation))
        const urls = await Promise.all(keys.map((k) => storage.signedUrl(k, CHAT_IMAGE_URL_TTL_SECONDS, "GET")))
        return { ...m, attachments: urls }
      })
    )
  }
}
