/**
 * Quyền vào phòng trao đổi nội bộ theo TỔ CHỨC (+ chi nhánh), không theo danh sách mời — PO duyệt D1, D7, D10
 * (`docs/plan/hoan-thien-chat-noi-bo.md`). Mã năng lực kiểm ở route; hàm này chỉ trả lời "phòng này có thuộc phạm
 * vi người gọi không". Pure TypeScript.
 *
 * - Người của tổ chức chủ phòng: vào được; phòng chi nhánh (`branchId`) chỉ người phạm vi toàn tổ chức hoặc đúng
 *   chi nhánh đó.
 * - Người của tổ chức bên kia (`counterpartOrgId`): liên kết ACTIVE → đọc + gửi; SUSPENDED → chỉ đọc; khác → không.
 * - Phòng cũ chưa có bên kia (luồng theo đơn trước D3): giữ cơ chế thành viên + liên kết ACTIVE.
 */

export type ConversationAccess = "NONE" | "READ" | "READ_WRITE"

export type LinkState = "ACTIVE" | "SUSPENDED" | "OTHER"

export interface AccessConversation {
  organizationId: string
  counterpartOrgId?: string | null | undefined
  branchId?: string | null | undefined
}

export interface AccessCaller {
  organizationId: string
  /** `memberships.branch_id` — null = phạm vi toàn tổ chức */
  branchId: string | null
}

export function canAccessConversation(
  conversation: AccessConversation,
  caller: AccessCaller,
  facts: { linkState: LinkState; isLegacyParticipant: boolean }
): ConversationAccess {
  if (caller.organizationId === conversation.organizationId) {
    if (!conversation.branchId) return "READ_WRITE"
    return caller.branchId === null || caller.branchId === conversation.branchId ? "READ_WRITE" : "NONE"
  }
  if (conversation.counterpartOrgId) {
    if (caller.organizationId !== conversation.counterpartOrgId) return "NONE"
    if (facts.linkState === "ACTIVE") return "READ_WRITE"
    return facts.linkState === "SUSPENDED" ? "READ" : "NONE"
  }
  return facts.isLegacyParticipant && facts.linkState === "ACTIVE" ? "READ_WRITE" : "NONE"
}

/** Khoá chống trùng phòng trong tổ chức chủ phòng. */
export function partnerRoomKey(partnerOrgId: string): string {
  return `partner:${partnerOrgId}`
}

export function branchRoomKey(branchId: string): string {
  return `branch:${branchId}`
}
