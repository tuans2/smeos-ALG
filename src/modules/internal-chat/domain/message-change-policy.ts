/**
 * Sửa / thu hồi tin nhắn trong Trao đổi nội bộ (mở rộng phạm vi §1 kế hoạch theo yêu cầu PO 09/11/2026). Pure TS.
 *
 * - Chỉ người gửi, chỉ tin của chính mình, trong 24 giờ kể từ lúc gửi.
 * - Chỉ tin chữ và tin ảnh (sửa = đổi chú thích). Thẻ đơn gia công / thẻ đơn cũ / tin hệ thống phản chiếu nghiệp vụ —
 *   không sửa, không thu hồi.
 * - Tin đã thu hồi không sửa / thu hồi lại được.
 */
export const MESSAGE_CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000
const CHANGEABLE_TYPES = new Set(["TEXT", "IMAGE"])

export type MessageChangeCheck = { ok: true } | { ok: false; reason: "NOT_OWNER" | "NOT_CHANGEABLE" | "DELETED" | "TOO_LATE" }

export function checkMessageChange(
  message: { senderUserId: string; messageType: string; isDeleted: boolean; createdAt: Date },
  callerUserId: string,
  now: Date
): MessageChangeCheck {
  if (message.senderUserId !== callerUserId) return { ok: false, reason: "NOT_OWNER" }
  if (message.isDeleted) return { ok: false, reason: "DELETED" }
  if (!CHANGEABLE_TYPES.has(message.messageType)) return { ok: false, reason: "NOT_CHANGEABLE" }
  if (now.getTime() - message.createdAt.getTime() > MESSAGE_CHANGE_WINDOW_MS) return { ok: false, reason: "TOO_LATE" }
  return { ok: true }
}
