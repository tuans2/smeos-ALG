/**
 * Quy ước đặt mã cho sản phẩm do hệ thống tạo ra.
 *
 * Hai cổng duyệt đều có thể tạo một bản ghi `products` mới: duyệt phân tích
 * ảnh (M01, `H3`) khi lượt phân tích chưa gắn sản phẩm, và duyệt dữ liệu bán
 * hàng (M01b, `H6`) khi bản copy cũng chưa gắn. Hai cổng đó phải sinh ra mã
 * theo CÙNG một quy ước — nếu không, cùng một sản phẩm sẽ mang mã khác nhau
 * tuỳ người vận hành bấm nút nào trước, và danh mục mất khả năng đối soát.
 *
 * Quy ước: `AUTO-` + tám ký tự hoa. Mã sinh máy tự nhận mình là sinh máy, để
 * lọc ra được khi tổ chức nhập mã theo danh mục thật.
 *
 * Tệp thuần: không import hạ tầng.
 */

export const AUTO_CODE_PREFIX = "AUTO-" as const

/** `seed` là một chuỗi ngẫu nhiên (thường là `randomUUID()`). */
export function draftProductCode(seed: string): string {
  return `${AUTO_CODE_PREFIX}${seed.replace(/-/g, "").slice(0, 8).toUpperCase()}`
}

export function isAutoProductCode(code: string): boolean {
  return code.startsWith(AUTO_CODE_PREFIX)
}
