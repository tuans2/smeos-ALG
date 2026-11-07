import { phoneHash, requirePiiMasterKey } from "./pii-cipher"

/**
 * ADR-014 D-P3: điều kiện Prisma tra cứu theo số điện thoại qua `*_hash` / `*_last4` — cột số điện thoại chỉ chứa bản
 * mã (P-5c), so chuỗi trên cột đó không bao giờ khớp. `field` là cột số (`phone`, `customer_phone`); cột băm/4 số cuối là
 * `<field>_hash` / `<field>_last4`. Đặt điều kiện trong `AND: [...]` hoặc làm bộ lọc quan hệ (`customer: phoneEquals(...)`)
 * để không đè `OR` sẵn có. Số không có chữ số nào → điều kiện không khớp dòng nào.
 */

type Where = Record<string, unknown>

const NO_MATCH = "\u0000" // băm thật không bao giờ là chuỗi này

/** Đúng số (mọi cách viết: +84, dấu chấm, khoảng trắng) trong tổ chức. */
export function phoneEquals(organizationId: string, phone: string, field = "phone"): Where {
  return { [`${field}_hash`]: phoneHash(requirePiiMasterKey(), organizationId, phone) ?? NO_MATCH }
}

/** Một trong các số. */
export function phoneIn(organizationId: string, phones: string[], field = "phone"): Where {
  const master = requirePiiMasterKey()
  const hashes = phones.map((p) => phoneHash(master, organizationId, p)).filter((h): h is string => !!h)
  return { [`${field}_hash`]: { in: hashes } }
}

/**
 * Ô tìm kiếm (PO D-49): đúng 4 chữ số → khớp 4 số cuối; từ 9 chữ số → đúng số; còn lại → `null` (không tìm theo số —
 * tìm theo phần giữa số điện thoại không còn).
 */
export function phoneSearch(organizationId: string, query: string, field = "phone"): Where | null {
  const digits = query.replace(/\D/g, "")
  if (digits.length === 4) return { [`${field}_last4`]: digits }
  if (digits.length >= 9) return phoneEquals(organizationId, query, field)
  return null
}
