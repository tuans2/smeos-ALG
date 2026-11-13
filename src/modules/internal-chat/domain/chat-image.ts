import { checkUploadContent } from "@/modules/assets/domain/upload-content-rules"

/**
 * Ảnh trong tin nhắn tự do của Trao đổi nội bộ (PO P4, D6 — kế hoạch GĐ8). Ảnh chat KHÔNG chạy chặng nào trong 14
 * chặng hành trình sản phẩm; ảnh của đơn (thành phẩm, bàn giao) vẫn đi qua Thẻ Gia Công. Pure TypeScript.
 */
export const MAX_CHAT_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_CHAT_IMAGES_PER_MESSAGE = 5
const ALLOWED = ["jpg", "png", "webp"] as const
export type ChatImageExt = (typeof ALLOWED)[number]

export type ChatImageCheck = { ok: true; ext: ChatImageExt; contentType: string } | { ok: false; reason: "empty" | "too_large" | "unsupported_type" }

/** Nhận dạng theo byte đầu tệp (không tin tên / loại do trình duyệt gửi): chỉ JPEG, PNG, WebP; ≤ 10 MB. */
export function checkChatImage(bytes: Uint8Array): ChatImageCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: "empty" }
  if (bytes.byteLength > MAX_CHAT_IMAGE_BYTES) return { ok: false, reason: "too_large" }
  for (const ext of ALLOWED) {
    const check = checkUploadContent(`anh.${ext}`, bytes)
    if (check.ok) return { ok: true, ext, contentType: check.contentType }
  }
  return { ok: false, reason: "unsupported_type" }
}

/** Thư mục ảnh của một phòng — đoạn thứ hai của khoá `org/<tổ chức chủ phòng>/chat-<phòng>/<id>.<đuôi>`. */
export function chatImageFolder(conversationId: string): string {
  return `chat-${conversationId}`
}

/** Khoá có đúng thuộc thư mục ảnh của phòng này không — chỉ ký URL cho khoá đúng phòng. */
export function isRoomImageKey(key: string, room: { organizationId: string; id: string }): boolean {
  const prefix = `org/${room.organizationId}/${chatImageFolder(room.id)}/`
  return key.startsWith(prefix) && !key.slice(prefix.length).includes("/") && !key.includes("..")
}
