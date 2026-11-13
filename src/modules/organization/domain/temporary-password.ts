/**
 * Mật khẩu tạm Điều hành cấp cho nhân viên (PO 08/10/2026): 12 ký tự, bỏ ký tự dễ đọc nhầm
 * (0/O, 1/l/I), luôn đủ độ dài tối thiểu `MIN_PASSWORD_LENGTH`. Chỉ hiện MỘT lần lúc tạo/đặt lại,
 * không lưu, không ghi nhật ký. Pure TypeScript — nguồn ngẫu nhiên do bên gọi đưa vào.
 */

export const TEMPORARY_PASSWORD_LENGTH = 12
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

export type RandomBytes = (size: number) => Uint8Array

export function generateTemporaryPassword(randomBytes: RandomBytes): string {
  // Lấy dư nhiều byte rồi bỏ byte lệch phân phối (≥ 224 = 4 × 56) — mọi ký tự đồng xác suất
  let out = ""
  while (out.length < TEMPORARY_PASSWORD_LENGTH) {
    for (const b of randomBytes(TEMPORARY_PASSWORD_LENGTH * 2)) {
      if (b >= 224) continue
      out += ALPHABET[b % ALPHABET.length]
      if (out.length === TEMPORARY_PASSWORD_LENGTH) break
    }
  }
  return out
}
