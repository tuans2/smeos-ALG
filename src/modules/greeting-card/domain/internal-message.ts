/**
 * Tin nhắn nội bộ Thẻ chào: vai của người dùng, người nhận, ai được thấy tin nào.
 * Pure TypeScript.
 */
import type { StepOwner } from "./step-sla"

export type MessageRole = StepOwner // ADMIN | SALE | COORDINATOR
export const MESSAGE_ROLE_LABEL: Record<MessageRole, string> = { ADMIN: "Điều hành", SALE: "Sale", COORDINATOR: "Điều phối" }
export const MAX_MESSAGE_LENGTH = 2000
/** Người gửi của tin do khách tạo từ trang theo dõi (vd. xin đổi thông tin đơn) — không phải nhân viên. */
export const CUSTOMER_SENDER_ID = "customer"
export const CUSTOMER_SENDER_LABEL = "Khách hàng"

/**
 * Vai chính để nhận tin và việc: Điều hành (F2) > Điều phối (R4/R5) > Sale (R2).
 * Người không thuộc vai nào vẫn đọc được trao đổi của đơn nhưng không có hộp việc theo vai.
 */
export function roleOf(capabilities: ReadonlySet<string>): MessageRole | null {
  if (capabilities.has("F2")) return "ADMIN"
  if (capabilities.has("R4") || capabilities.has("R5")) return "COORDINATOR"
  if (capabilities.has("R2")) return "SALE"
  return null
}

/** Người nhận do người gửi chọn — `OWNER_SALE` = sale phụ trách đơn (máy chủ tự tìm). */
export type RecipientChoice =
  | { kind: "ROLE"; role: MessageRole }
  | { kind: "OWNER_SALE" }
  | { kind: "USER"; userId: string }

export interface ResolvedRecipient {
  toRole: MessageRole | null
  toUserId: string | null
}

/** Sale phụ trách là link riêng của một người → gửi đúng người; link công khai → mọi sale. */
export function resolveRecipient(choice: RecipientChoice, ownerSaleId: string | null): ResolvedRecipient {
  if (choice.kind === "ROLE") return { toRole: choice.role, toUserId: null }
  if (choice.kind === "USER") return { toRole: null, toUserId: choice.userId }
  return ownerSaleId && ownerSaleId !== "public" ? { toRole: null, toUserId: ownerSaleId } : { toRole: "SALE", toUserId: null }
}

/** Tin này có gửi cho tôi không (để đếm chưa đọc và đưa vào hộp việc). */
export function isAddressedTo(
  msg: { senderId: string; toRole: string | null; toUserId: string | null },
  me: { userId: string; role: MessageRole | null },
): boolean {
  if (msg.senderId === me.userId) return false
  if (msg.toUserId) return msg.toUserId === me.userId
  return !!msg.toRole && msg.toRole === me.role
}

export function recipientLabel(msg: { toRole: string | null; toUserName?: string | null }): string {
  if (msg.toUserName) return msg.toUserName
  return msg.toRole ? MESSAGE_ROLE_LABEL[msg.toRole as MessageRole] ?? "Mọi người" : "Mọi người"
}
