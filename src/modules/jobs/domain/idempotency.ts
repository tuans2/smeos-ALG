/**
 * `YC-U7` — chống trùng cho mọi `POST` tạo job. Client gửi `Idempotency-Key`
 * qua header; cùng khoá trong 24 giờ trả lại job cũ thay vì tạo job mới.
 * Thuần: chỉ đọc header, không chạm cơ sở dữ liệu.
 */
export const IDEMPOTENCY_KEY_HEADER = "idempotency-key"
export const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000

export function readIdempotencyKey(request: Request): string | null {
  const value = request.headers.get(IDEMPOTENCY_KEY_HEADER)
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Dạng chuẩn để so khớp: khoá sắp xếp (Postgres `jsonb` tự đổi thứ tự khoá), bỏ `undefined` như JSON. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)])
    )
  }
  return value
}

/**
 * Cùng `Idempotency-Key` có phải cùng một yêu cầu không (audit API-11, PO 07/11/2026): so `payload` đã
 * lưu với `payload` mới theo dạng chuẩn JSON. Lệch thì `enqueueJob` chỉ GHI CẢNH BÁO, vẫn trả job cũ —
 * PO chọn đo tần suất trước khi chặn 422.
 */
export function samePayload(stored: unknown, incoming: unknown): boolean {
  const normalize = (value: unknown) => JSON.stringify(canonical(JSON.parse(JSON.stringify(value ?? null))))
  return normalize(stored) === normalize(incoming)
}
