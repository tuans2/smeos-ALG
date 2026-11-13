/**
 * Trang theo dõi đơn công khai (PO 06/10/2026): ai có mã đơn cũng mở được — mà mã đơn nằm trong
 * nội dung chuyển khoản — nên mặc định chỉ hiện thông tin rút gọn. Xem đầy đủ khi mở từ chính
 * link của khách, hoặc nhập đúng 4 số cuối SĐT người đặt. Pure TypeScript.
 */

/** "Nguyễn Văn An" → "N. V. An" (giữ tên gọi, viết tắt họ/đệm). */
export function maskPersonName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "Khách nhận"
  if (parts.length === 1) return parts[0]!
  return [...parts.slice(0, -1).map((p) => `${p[0]!.toUpperCase()}.`), parts[parts.length - 1]].join(" ")
}

/** Chỉ phường/xã + tỉnh/thành: từ 5 ô địa chỉ nếu có, không thì hai cụm cuối của dòng địa chỉ. */
export function areaOnly(address: { street?: string | null; parts?: { ward?: string; province?: string } | null }): string {
  const ward = address.parts?.ward?.trim()
  const province = address.parts?.province?.trim()
  if (ward || province) return [ward, province].filter(Boolean).join(", ")
  const segments = (address.street ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  return segments.length >= 2 ? segments.slice(-2).join(", ") : ""
}

/** 4 số cuối SĐT người đặt khớp (bỏ ký tự không phải số). */
export function phoneLast4Matches(phone: string | null | undefined, last4: string): boolean {
  const digits = (phone ?? "").replace(/\D/g, "")
  return /^\d{4}$/.test(last4) && digits.length >= 4 && digits.slice(-4) === last4
}
