import { pathPattern } from "./deprecation"

/**
 * Phản hồi mà client có thể không đọc thân. Chromium không hoàn tất một request có
 * `Cache-Control: no-store` khi trang không đọc thân phản hồi: kết nối bị giữ tới khi GC dọn đối tượng
 * `Response`, và trang không bao giờ "rảnh mạng" (`networkidle`) — e2e-ux treo 15 phút trên PR #172.
 * Mặc định `no-store` của `jsonResponse` (audit API-17) vì vậy được hạ thành `no-cache` cho:
 *
 * 1. Mọi phản hồi lỗi (≥ 400): thân chỉ là envelope `{ error }`, không mang dữ liệu tổ chức, và nhiều
 *    client chỉ xem `res.ok` (404 của link gia công không tồn tại, 404 khác tổ chức…).
 * 2. Route chỉ trả xác nhận mà trang khách gọi kiểu "bắn rồi quên" (`ACK_ONLY_ROUTES`): đếm lượt xem,
 *    nhận chủ phiên rồi `router.refresh()`.
 *
 * `no-cache` vẫn bắt hỏi lại máy chủ trước khi dùng bản lưu; phản hồi POST không bị dùng lại từ bộ đệm.
 * Thêm route vào `ACK_ONLY_ROUTES` khi client gọi mà không đọc thân và thân không chứa dữ liệu cần giấu.
 */
export const ACK_ONLY_ROUTES: readonly { method: "POST"; path: string }[] = [
  { method: "POST", path: "/api/v1/public/greeting-catalog/[id]/event" },
  { method: "POST", path: "/api/v1/public/brochure/[sendCode]/event" },
  { method: "POST", path: "/api/v1/public/brochure/[sendCode]/claim" },
]

export function isAckOnlyRoute(method: string, pathname: string): boolean {
  return ACK_ONLY_ROUTES.some((route) => route.method === method.toUpperCase() && pathPattern(route.path).test(pathname))
}

/** Đổi `no-store` mặc định thành `no-cache` cho phản hồi lỗi và route chỉ xác nhận; giá trị khác giữ nguyên. */
export function withUnreadBodyCacheHeader(response: Response, method: string, pathname: string): Response {
  if (response.headers.get("cache-control") !== "no-store") return response
  if (response.status < 400 && !isAckOnlyRoute(method, pathname)) return response
  try {
    response.headers.set("cache-control", "no-cache")
  } catch {
    // Header bất biến — giữ nguyên phản hồi
  }
  return response
}
