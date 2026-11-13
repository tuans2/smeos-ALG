import { headers } from "next/headers"

/**
 * Header `Cookie` gốc của request đang render, để dựng `Request` cho `resolveSession` / `resolveAppSession`.
 *
 * Không ghép lại từ `cookies().getAll()`: hàm đó trả giá trị ĐÃ giải mã. Cookie có chữ ngoài Latin-1 (vd.
 * `DEV_ROLE_COOKIE` chứa tên tiệm tiếng Việt, được ghi dạng `%C4%90…`) thành "Đ…" và `new Request(...)` ném
 * "Cannot convert argument to a ByteString" — layout trả 500. Header gốc luôn là ByteString hợp lệ; nơi đọc
 * giá trị tự `decodeURIComponent` (`readCookieValue`).
 */
export async function requestCookieHeader(): Promise<string> {
  return (await headers()).get("cookie") ?? ""
}
