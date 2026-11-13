/**
 * Gắn shipper nội bộ với đơn đang giao (checklist ALG 4.5): Điều phối ghi số điện thoại shipper lúc
 * điều xe; tài khoản vai Shipper có cùng số (trong cùng tổ chức) thấy đơn đó. Luật thuần.
 */

import { canonicalVnPhone } from "@/modules/organization/domain/staff-phone"

export function isSameShipper(assignedPhone: string | null | undefined, userPhone: string | null | undefined): boolean {
  const a = canonicalVnPhone(assignedPhone)
  return a !== null && a === canonicalVnPhone(userPhone)
}
