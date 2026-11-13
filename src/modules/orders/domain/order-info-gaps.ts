/**
 * Đơn thiếu thông tin (checklist ALG 4.14) — luật thuần: trường nào còn thiếu để giao được đơn, và
 * một yêu cầu bổ sung đang mở có quá hạn chưa. Đọc cả hai dạng địa chỉ: đơn đa nguồn (`phone` trong địa
 * chỉ) và đơn Điều phối (`recipientPhone` trong metadata điều phối).
 */

export const AUTO_INFO_FIELDS = {
  deliveryAddress: "Địa chỉ giao hàng",
  recipientPhone: "Số điện thoại người nhận",
  cardMessage: "Lời chúc trên thiệp",
} as const

export type AutoInfoField = keyof typeof AUTO_INFO_FIELDS

/** Hạn mặc định để có câu trả lời cho yêu cầu tự sinh. */
export const DEFAULT_INFO_DUE_MINUTES = 120

export const OPEN_INFO_STATUSES = ["OPEN", "SENT", "WAITING", "OVERDUE"] as const

export interface InfoGapInput {
  deliveryAddress: unknown
  coordinationMeta: unknown
  cardMessage: string | null
  cardRequired: boolean
}

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0

function addressFilled(addr: unknown): boolean {
  if (filled(addr)) return true
  if (!addr || typeof addr !== "object") return false
  const a = addr as Record<string, unknown>
  return filled(a.street) || filled(a.formattedAddress)
}

/** Trường bắt buộc còn thiếu của đơn; lời chúc chỉ bắt buộc khi đơn có thiệp. */
export function missingInfoFields(input: InfoGapInput): AutoInfoField[] {
  const addr = input.deliveryAddress && typeof input.deliveryAddress === "object" ? (input.deliveryAddress as Record<string, unknown>) : {}
  const meta = input.coordinationMeta && typeof input.coordinationMeta === "object" ? (input.coordinationMeta as Record<string, unknown>) : {}
  const missing: AutoInfoField[] = []
  if (!addressFilled(input.deliveryAddress)) missing.push("deliveryAddress")
  if (!filled(addr.phone) && !filled(meta.recipientPhone)) missing.push("recipientPhone")
  if (input.cardRequired && !filled(input.cardMessage)) missing.push("cardMessage")
  return missing
}

export function isAutoInfoField(field: string): field is AutoInfoField {
  return Object.prototype.hasOwnProperty.call(AUTO_INFO_FIELDS, field)
}

export function isInfoRequestOverdue(status: string, dueAt: Date | null, now: Date): boolean {
  return (status === "OPEN" || status === "SENT" || status === "WAITING") && dueAt !== null && dueAt.getTime() < now.getTime()
}
