/**
 * Token của link Thẻ Gia Công (`?t=` trên URL chi nhánh nhận được). Mọi lời gọi API công khai
 * của trang phải mang nó — máy chủ trả 404 nếu thiếu hoặc sai.
 */
export function subcontractLinkToken(): string {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("t") ?? ""
}

/** Header gửi kèm mọi lời gọi `/api/v1/public/subcontract/*`. */
export function subcontractAccessHeaders(extra?: Record<string, string>): Record<string, string> {
  return { ...extra, "x-subcontract-token": subcontractLinkToken() }
}
