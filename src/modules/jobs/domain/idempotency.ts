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
 * Cùng `Idempotency-Key` có phải cùng một yêu cầu không (audit API-11): so `payload` đã lưu với `payload` mới theo
 * dạng chuẩn JSON. Lệch → `enqueueJob` trả 422 `IDEMPOTENCY_KEY_REUSED` (PO 09/11/2026), trừ feature trong
 * `KEY_REUSE_ALLOWED`.
 */
export function samePayload(stored: unknown, incoming: unknown): boolean {
  const normalize = (value: unknown) => JSON.stringify(canonical(JSON.parse(JSON.stringify(value ?? null))))
  return normalize(stored) === normalize(incoming)
}

/**
 * Feature CỐ Ý gửi lại cùng khoá với thân có thể khác để MỞ LẠI kết quả đã có (audit API-11, PO 09/11/2026) — với
 * chúng, cùng khoá khác thân vẫn trả job cũ như trước. Thêm vào đây phải ghi lý do.
 */
export const KEY_REUSE_ALLOWED: Readonly<Record<string, string>> = {
  // `scenePlanKey(assetId, topicId, mode)` (components/creative-studio/scene-plan-client.ts) mở lại kịch bản đã có;
  // nhà viết / nền tảng / đầu ra trong thân có thể khác giữa hai lần mở.
  "creative.scene_plan": "Mở lại kịch bản theo (ảnh, chủ đề, chế độ)",
  // Khoá `product-copy:<analysisId>` (tai-anh, content-studio): một lượt phân tích một Bài giới thiệu; `product_id`
  // trong thân lấy từ bản phân tích nên đổi khi bản phân tích được gắn sản phẩm sau lần gọi đầu.
  "product.copy.generate": "Mở lại Bài giới thiệu theo lượt phân tích",
}

export function allowsKeyReuse(feature: string): boolean {
  return Object.hasOwn(KEY_REUSE_ALLOWED, feature)
}
