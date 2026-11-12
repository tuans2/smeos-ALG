/**
 * Lịch thay đổi phá vỡ của `POST /integration/jobs` (PO 11/11/2026, audit API-11, đặc tả 06 "Version và gỡ endpoint").
 *
 * Đường nội bộ đã chặn 422 `IDEMPOTENCY_KEY_REUSED` khi cùng `Idempotency-Key` mà `payload`/sản phẩm khác (09/11/2026).
 * Bên thứ ba (LocalBudd, SocialFlow, đối tác) được báo trước đủ `NOTICE_DAYS.external` ngày: trước `effective` vẫn nhận
 * job cũ (hành vi cũ, chỉ ghi cảnh báo), từ 00:00 UTC ngày `effective` trở đi nhận 422 như đường nội bộ. Không dời ngày
 * sớm hơn — `integration-key-reuse.test.ts` đỏ khi khoảng báo trước dưới mức tối thiểu.
 */
export const INTEGRATION_KEY_REUSE_CHANGE = {
  announced: "2026-11-11",
  effective: "2027-02-09",
} as const

/** `"legacy"` trong thời gian báo trước; `undefined` (luật chung, chặn 422) từ ngày hiệu lực. */
export function integrationKeyReuseMode(now: Date): "legacy" | undefined {
  return now.getTime() < Date.parse(`${INTEGRATION_KEY_REUSE_CHANGE.effective}T00:00:00Z`) ? "legacy" : undefined
}
