import type { IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage, ActionCardOrderPayload } from "../domain/chat-entities"
import { ChatAccessDeniedError, ChatDomainError } from "../domain/errors"

export interface HandleCardActionInput {
  messageId: string
  userId: string
  userOrgId: string
  action: "ACCEPT_ORDER" | "REJECT_ORDER"
  rejectedReason?: string | undefined
}


export class HandleCardActionUseCase {
  constructor(private readonly chatRepo: IInternalChatRepository) {}

  async execute(input: HandleCardActionInput): Promise<InternalChatMessage> {
    // Cách ly tenant (08/11/2026, audit API §15): trước đây ghi thẳng theo mã tin, không kiểm tin thuộc hội thoại nào
    // hay người bấm có tham gia không — người của tổ chức bất kỳ biết mã tin là sửa được thẻ của tổ chức khác.
    // Không thấy tin hoặc không phải người tham gia → 404 như nhau (không lộ tin có tồn tại).
    const message = await this.chatRepo.findMessageById(input.messageId)
    if (!message || message.isDeleted || !(await this.chatRepo.isParticipant(message.conversationId, input.userId))) {
      throw new ChatAccessDeniedError()
    }
    if (message.messageType !== "ACTION_CARD_ORDER") {
      throw new ChatDomainError("Tin nhắn này không có nút nhận hoặc từ chối đơn", "CONFLICT", "NOT_ORDER_ACTION_CARD")
    }
    // Giữ nguyên trạng thái sống của thẻ (mã đơn, khách, giá…) — chỉ đổi phần do nút bấm quyết định.
    const currentPayload = message.actionPayload as Partial<ActionCardOrderPayload>

    // Prepare updated state
    let newStatus: "ACCEPTED" | "REJECTED" = "ACCEPTED"
    if (input.action === "REJECT_ORDER") {
      newStatus = "REJECTED"
    }

    const updatedPayload: Partial<ActionCardOrderPayload> = {
      ...currentPayload,
      status: newStatus,
      assignedPartnerOrgId: input.userOrgId,
      rejectedReason: input.rejectedReason,
    }

    const updatedMessage = await this.chatRepo.updateActionPayload(input.messageId, {
      ...updatedPayload,
      updatedAt: new Date().toISOString(),
      actionByUserId: input.userId,
    })

    // Post an announcement message into the thread
    const statusText = newStatus === "ACCEPTED" ? "ĐÃ CHẤP NHẬN ĐƠN HÀNG" : `ĐÃ TỪ CHỐI ĐƠN HÀNG (Lý do: ${input.rejectedReason ?? "Bận việc"})`
    await this.chatRepo.sendMessage({
      conversationId: updatedMessage.conversationId,
      senderUserId: input.userId,
      senderRole: "partner_member",
      messageType: "SYSTEM_NOTICE",
      content: `Đối tác ${statusText}`,
    })

    return updatedMessage
  }
}
