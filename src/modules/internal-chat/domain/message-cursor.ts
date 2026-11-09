/**
 * Con trỏ phân trang tin nhắn (đi lùi về tin cũ hơn): mốc `created_at` + `id` để hai tin cùng mili-giây
 * không bị bỏ sót ở ranh giới trang. Client coi là chuỗi mờ, chỉ gửi lại nguyên văn qua `?before=`.
 * Pure TypeScript.
 */

export interface MessageCursor {
  createdAt: Date
  id: string
}

const SEPARATOR = "~"

export function encodeMessageCursor(cursor: MessageCursor): string {
  return `${cursor.createdAt.toISOString()}${SEPARATOR}${cursor.id}`
}

/** Chuỗi hỏng → null (route trả 400). */
export function decodeMessageCursor(raw: string): MessageCursor | null {
  const at = raw.indexOf(SEPARATOR)
  if (at <= 0 || at === raw.length - 1) return null
  const createdAt = new Date(raw.slice(0, at))
  const id = raw.slice(at + 1)
  if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{8,64}$/i.test(id)) return null
  return { createdAt, id }
}
