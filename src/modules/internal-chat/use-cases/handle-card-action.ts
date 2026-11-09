import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage, ActionCardOrderPayload } from "../domain/chat-entities"
import { ChatAccessDeniedError, CardActionConflictError } from "../domain/errors"
import { assertConversationAccess } from "./conversation-access"

export interface HandleCardActionInput {
  messageId: string
  userId: string
  userOrgId: string
  userRole: string
  action: "ACCEPT_ORDER" | "REJECT_ORDER"
  rejectedReason?: string | undefined
}

const DEFAULT_REJECT_REASON = "Bận việc"

/**
 * Đối tác bấm Nhận / Từ chối trên thẻ đơn. Chỉ tổ chức được giao (`assignedPartnerOrgId`) mới bấm được, và chỉ khi
 * thẻ còn chờ nhận; người gửi thẻ không tự bấm. Sai bất kỳ điều kiện nào về quyền → 404 (không lộ thẻ tồn tại);
 * thẻ đã xử lý / vừa bị người khác xử lý trước → 409. Cập nhật là gộp có điều kiện — không mất mã đơn, giá, ảnh.
 */
export class HandleCardActionUseCase {
  constructor(
    private readonly chatRepo: IInternalChatRepository,
    private readonly linkPolicy: IChatLinkPolicy
  ) {}

  async execute(input: HandleCardActionInput): Promise<InternalChatMessage> {
    const message = await this.chatRepo.findMessageById(input.messageId)
    if (!message || message.isDeleted) throw new ChatAccessDeniedError()
    await assertConversationAccess(this.chatRepo, this.linkPolicy, message.conversationId, {
      userId: input.userId,
      organizationId: input.userOrgId,
    })

    const card = message.actionPayload as Partial<ActionCardOrderPayload>
    if (message.messageType !== "ACTION_CARD_ORDER") throw new ChatAccessDeniedError()
    if (card.assignedPartnerOrgId !== input.userOrgId || message.senderUserId === input.userId) throw new ChatAccessDeniedError()
    if (card.status !== "PENDING_ACCEPT") throw new CardActionConflictError()

    const accepted = input.action === "ACCEPT_ORDER"
    const reason = input.rejectedReason?.trim() || DEFAULT_REJECT_REASON
    const updated = await this.chatRepo.updateCardIfStatus(input.messageId, "PENDING_ACCEPT", {
      status: accepted ? "ACCEPTED" : "REJECTED",
      ...(accepted ? {} : { rejectedReason: reason }),
      actionByUserId: input.userId,
      updatedAt: new Date().toISOString(),
    })
    if (!updated) throw new CardActionConflictError()

    await this.chatRepo.sendMessage({
      conversationId: message.conversationId,
      senderUserId: input.userId,
      senderRole: input.userRole,
      messageType: "SYSTEM_NOTICE",
      content: accepted ? "Đối tác đã nhận đơn" : `Đối tác đã từ chối đơn (lý do: ${reason})`,
    })

    return updated
  }
}
