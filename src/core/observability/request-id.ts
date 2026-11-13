/**
 * Mã yêu cầu (`x-request-id`) — nối một dòng log web với job và dòng log worker
 * của cùng một thao tác (chuẩn 09, ROADMAP E1.1).
 *
 * Phần này không phụ thuộc Node để `src/proxy.ts` dùng được; ngữ cảnh theo
 * request (AsyncLocalStorage) nằm ở `request-context.ts`.
 */

export const REQUEST_ID_HEADER = "x-request-id"

// Chỉ nhận mã do proxy/hạ tầng phía trước gửi nếu an toàn để ghi log và lưu DB.
const MA_HOP_LE = /^[A-Za-z0-9._:-]{8,128}$/

/** Giữ mã đến nếu hợp lệ, không thì sinh mã mới. */
export function resolveRequestId(incoming: string | null | undefined): string {
  if (incoming && MA_HOP_LE.test(incoming)) return incoming
  return crypto.randomUUID()
}
