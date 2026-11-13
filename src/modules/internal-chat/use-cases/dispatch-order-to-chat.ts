import type { IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatMessage, ActionCardOrderPayload } from "../domain/chat-entities"
import { ConversationNotFoundError } from "../domain/errors"

export interface DispatchOrderToChatInput {
  orderId: string
  orderCode: string
  coordinatorUserId: string
  coordinatorRole: string
  coordinatorOrgId: string
  targetPartnerOrgId: string
  targetPartnerUserId?: string | undefined
  customerName?: string | undefined
  recipientName?: string | undefined
  deliveryTime?: string | undefined
  deliveryAddress?: string | undefined
  priceVnd?: number | undefined
  thumbnailUrl?: string | undefined
}


export class DispatchOrderToChatUseCase {
  constructor(private readonly chatRepo: IInternalChatRepository) {}

  async execute(input: DispatchOrderToChatInput): Promise<{ conversationId: string; message: InternalChatMessage }> {
    let conv = await this.chatRepo.findConversationByOrderId(input.coordinatorOrgId, input.orderId)

    if (!conv) {
      const participants = [
        {
          userId: input.coordinatorUserId,
          organizationId: input.coordinatorOrgId,
          roleInChat: "OWNER",
        },
      ]

      if (input.targetPartnerUserId) {
        participants.push({
          userId: input.targetPartnerUserId,
          organizationId: input.targetPartnerOrgId,
          roleInChat: "MEMBER",
        })
      }

      conv = await this.chatRepo.createConversation({
        organizationId: input.coordinatorOrgId,
        conversationType: "ORDER_THREAD",
        title: `Đơn gia công #${input.orderCode}`,
        orderId: input.orderId,
        createdBy: input.coordinatorUserId,
        participantUserIds: participants,
        metadata: {
          targetPartnerOrgId: input.targetPartnerOrgId,
          orderCode: input.orderCode,
        },
      })
    } else if (input.targetPartnerUserId) {
      // Ensure target partner is participant
      const isPart = await this.chatRepo.isParticipant(conv.id, input.targetPartnerUserId)
      if (!isPart) {
        await this.chatRepo.addParticipant(conv.id, {
          userId: input.targetPartnerUserId,
          organizationId: input.targetPartnerOrgId,
          roleInChat: "MEMBER",
        })
      }
    }

    const payload: ActionCardOrderPayload = {
      orderId: input.orderId,
      orderCode: input.orderCode,
      customerName: input.customerName,
      recipientName: input.recipientName,
      deliveryTime: input.deliveryTime,
      deliveryAddress: input.deliveryAddress,
      priceVnd: input.priceVnd,
      thumbnailUrl: input.thumbnailUrl,
      status: "PENDING_ACCEPT",
      assignedPartnerOrgId: input.targetPartnerOrgId,
    }

    const message = await this.chatRepo.sendMessage({
      conversationId: conv.id,
      senderUserId: input.coordinatorUserId,
      senderRole: input.coordinatorRole,
      messageType: "ACTION_CARD_ORDER",
      content: `Điều phối đơn gia công #${input.orderCode} đến chi nhánh/đối tác`,
      actionPayload: payload as unknown as Record<string, unknown>,
    })

    return {
      conversationId: conv.id,
      message,
    }
  }
}
