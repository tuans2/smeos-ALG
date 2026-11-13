/**
 * Đọc thông báo lỗi từ đáp ứng `/api/v1/` — hình dạng chuẩn là
 * `{ error: { code, message, details } }`. Bản cũ đọc `body.error` như chuỗi
 * nên người dùng thấy "[object Object]". Lỗi kiểm dữ liệu ưu tiên câu đầu
 * tiên trong `details` (đã là tiếng Việt).
 */
export async function readApiError(res: Response, fallback: string): Promise<string> {
  const body: unknown = await res.json().catch(() => null)
  if (!body || typeof body !== "object") return fallback
  const error = (body as { error?: unknown }).error
  if (typeof error === "string") return error
  if (!error || typeof error !== "object") return fallback

  const { message, details } = error as { message?: unknown; details?: unknown }
  if (details && typeof details === "object") {
    const first = Object.values(details as Record<string, unknown>).find((v) => typeof v === "string")
    if (typeof first === "string") return first
  }
  if (res.status === 429 && typeof message === "string") return message
  return typeof message === "string" && message ? message : fallback
}

/** Định dạng giá VNĐ; `null` = mẫu chưa niêm yết giá (vẫn đặt được, cửa hàng báo giá sau). */
export function formatPriceVnd(price: number | null | undefined): string {
  return typeof price === "number" ? `${price.toLocaleString("vi-VN")} đ` : "Giá liên hệ"
}
