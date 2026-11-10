import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatConversation } from "../domain/chat-entities"
import { canAccessConversation, type LinkState } from "../domain/conversation-access-policy"
import { ChatAccessDeniedError, ConversationNotFoundError } from "../domain/errors"

export interface ChatCaller {
  userId: string
  organizationId: string
  /** `memberships.branch_id` — null / vắng = phạm vi toàn tổ chức */
  branchId?: string | null | undefined
}

/**
 * Cổng chung của đọc / gửi / bấm thẻ (D1, D7, D10): quyền theo tổ chức + chi nhánh của người gọi
 * (`canAccessConversation`), cửa hàng đối tác cần liên kết còn hiệu lực (tạm dừng = chỉ đọc). Phòng cũ chưa có bên
 * kia giữ cơ chế thành viên + liên kết ACTIVE. Mọi trường hợp sai đều 404 — không xác nhận phòng có tồn tại.
 */
export async function assertConversationAccess(
  chatRepo: IInternalChatRepository,
  linkPolicy: IChatLinkPolicy,
  conversationId: string,
  caller: ChatCaller,
  need: "READ" | "WRITE" = "WRITE"
): Promise<InternalChatConversation> {
  const conv = await chatRepo.findConversationById(conversationId)
  if (!conv) throw new ConversationNotFoundError(conversationId)

  const sameOrg = conv.organizationId === caller.organizationId
  let linkState: LinkState = "OTHER"
  let isLegacyParticipant = false
  if (!sameOrg && conv.counterpartOrgId === caller.organizationId) {
    linkState = await linkPolicy.linkState(conv.organizationId, caller.organizationId)
  } else if (!sameOrg && !conv.counterpartOrgId) {
    isLegacyParticipant = await chatRepo.isParticipant(conversationId, caller.userId)
    if (isLegacyParticipant && (await linkPolicy.hasActiveLink(conv.organizationId, caller.organizationId))) linkState = "ACTIVE"
  }

  const access = canAccessConversation(conv, { organizationId: caller.organizationId, branchId: caller.branchId ?? null }, { linkState, isLegacyParticipant })
  if (access === "NONE" || (need === "WRITE" && access !== "READ_WRITE")) throw new ChatAccessDeniedError()
  return conv
}
