import type { IInternalChatRepository } from "../domain/chat-repository.interface"
import { partnerRoomKey } from "../domain/conversation-access-policy"
import { plainDispatchText, type SubcontractCardPayload } from "../domain/subcontract-card"
import { ensurePartnerConversation } from "./ensure-room"

export interface PostSubcontractMessageInput {
  chainOrgId: string
  partnerOrgId: string
  orderCode: string
  branchCode: string
  /** Tiêu đề + thân tin như gửi kênh nhân viên (HTML Telegram) */
  title: string
  messageText: string
  /** Lời mời nhận đơn → thẻ đơn gia công; khác (nhắc hạn, chốt làm, ...) → tin hệ thống */
  isInvite: boolean
}

export interface ChatRoomOwnerLookup {
  /** Thành viên đang hoạt động lâu nhất của chuỗi — ghi người tạo phòng khi phải tạo lúc bắn đơn */
  firstActiveMemberId(organizationId: string): Promise<string | null>
  organizationName(organizationId: string): Promise<string | null>
}

/**
 * Kênh mời trong Trao đổi nội bộ (PO P1/P2, kế hoạch GĐ4): mọi tin bộ máy bắn đơn gửi cho một ứng viên là cửa hàng
 * đối tác cũng được đăng vào phòng chung của chuỗi với cửa hàng đó. Lời mời thành thẻ đơn (trạng thái tính lúc đọc);
 * các tin khác thành tin hệ thống. Chữ đã bỏ HTML và link — link Thẻ Gia Công chỉ cấp lúc đọc cho đúng người.
 * Trả false khi không đăng được (không có phòng và không tạo được).
 */
export async function postSubcontractMessage(
  chatRepo: IInternalChatRepository,
  owners: ChatRoomOwnerLookup,
  input: PostSubcontractMessageInput
): Promise<boolean> {
  let room = await chatRepo.findConversationByRoomKey(input.chainOrgId, partnerRoomKey(input.partnerOrgId))
  if (!room) {
    const creator = await owners.firstActiveMemberId(input.chainOrgId)
    if (!creator) return false
    const name = await owners.organizationName(input.partnerOrgId)
    room = await ensurePartnerConversation(chatRepo, { chainOrgId: input.chainOrgId, partnerOrgId: input.partnerOrgId, title: `Trao đổi: ${name ?? "cửa hàng đối tác"}`, createdBy: creator })
  }

  const title = plainDispatchText(input.title)
  const body = plainDispatchText(input.messageText)
  const payload: SubcontractCardPayload = { kind: "SUBCONTRACT", orderCode: input.orderCode, branchCode: input.branchCode, title }
  await chatRepo.sendMessage({
    conversationId: room.id,
    senderUserId: room.createdBy,
    senderRole: "system",
    messageType: input.isInvite ? "ACTION_CARD_SUBCONTRACT" : "SYSTEM_NOTICE",
    content: input.isInvite ? body : [title, body].filter(Boolean).join("\n"),
    ...(input.isInvite ? { actionPayload: payload as unknown as Record<string, unknown> } : {}),
  })
  return true
}
