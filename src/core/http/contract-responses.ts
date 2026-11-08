import type { Page } from "./pagination"
import { jsonResponse } from "./response"

/**
 * Phản hồi thành công theo chuẩn API Contract v1.1 §2 + §4 (PO chốt 07/11/2026): một bản ghi
 * `{ data }`, danh sách `{ data, next_cursor }`. Dùng cho route mới qua `defineRoute`; route cũ giữ
 * hình dạng đang có trong `/v1`.
 */
type Headers = Record<string, string>

/** 200 `{ data }`. */
export function ok(data: unknown, headers?: Headers): Response {
  return jsonResponse({ data }, headers ? { headers } : undefined)
}

/** 201 `{ data }` + `Location` khi biết đường dẫn bản ghi mới. */
export function created(data: unknown, location?: string): Response {
  return jsonResponse({ data }, { status: 201, ...(location ? { headers: { location } } : {}) })
}

/** 202 `{ data }` — việc bất đồng bộ đã nhận (job AI, đặc tả 06 luật 4). */
export function accepted(data: unknown): Response {
  return jsonResponse({ data }, { status: 202 })
}

/** 204 không thân. */
export function noContent(): Response {
  return jsonResponse(null, { status: 204 })
}

/** 200 `{ data, next_cursor }`. */
export function page<T>(result: Page<T>): Response {
  return jsonResponse(result)
}
