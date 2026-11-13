/**
 * Thông điệp của một lỗi bắt được trong `catch (err: unknown)` — chuỗi rỗng khi
 * giá trị ném ra không phải `Error`, để gọi nơi dùng tự nối thông điệp dự phòng:
 * `setError(errorText(err) || "Lỗi tải dữ liệu")`.
 */
export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : ""
}
