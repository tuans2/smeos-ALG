/**
 * Số điện thoại của nhân viên (checklist ALG 4.5): Điều hành ghi khi tạo hoặc sửa tài khoản; Shipper
 * được gắn đơn qua số này. Luật thuần.
 */

/** Số điện thoại Việt Nam về một dạng so sánh được: chỉ chữ số, đầu `84`/`+84` → `0`; `null` khi không hợp lệ. */
export function canonicalVnPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D+/g, "")
  const local = digits.startsWith("84") && digits.length >= 11 ? `0${digits.slice(2)}` : digits
  return /^0\d{9,10}$/.test(local) ? local : null
}
