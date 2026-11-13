/**
 * Khoá `Idempotency-Key` cho một yêu cầu tạo job, giữ qua các lần thử lại CÙNG yêu cầu (bấm đúp, mạng chập) nhưng
 * đổi khi yêu cầu đổi (`sig` — ví dụ bộ kênh, bộ ảnh). Máy chủ trả 422 `IDEMPOTENCY_KEY_REUSED` khi cùng khoá mà thân
 * khác (audit API-11, PO 09/11/2026). Thuần — không React.
 */
export interface HeldKey {
  readonly key: string
  readonly sig: string
}

export function requestKey(held: HeldKey | null, sig: string, mint: () => string): HeldKey {
  return held && held.sig === sig ? held : { key: mint(), sig }
}
