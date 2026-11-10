import type { IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatConversation } from "../domain/chat-entities"
import { branchRoomKey, partnerRoomKey } from "../domain/conversation-access-policy"

/**
 * Mỗi liên kết chuỗi → cửa hàng đối tác có đúng MỘT phòng trao đổi (D3: khoá `partner:<đối tác>` duy nhất trong tổ
 * chức chuỗi); mỗi chi nhánh nội bộ một phòng (`branch:<chi nhánh>`, D10). Gọi lại bao nhiêu lần cũng ra cùng phòng —
 * hai lời gọi đua nhau thì lời gọi thua gặp lỗi trùng khoá và đọc lại phòng của lời gọi thắng.
 *
 * Không thêm ai vào phòng: quyền vào theo tổ chức + năng lực (D1), dòng thành viên tự tạo khi mở lần đầu.
 */
export async function ensurePartnerConversation(
  chatRepo: IInternalChatRepository,
  input: { chainOrgId: string; partnerOrgId: string; title: string; createdBy: string }
): Promise<InternalChatConversation> {
  const roomKey = partnerRoomKey(input.partnerOrgId)
  return ensureRoom(chatRepo, input.chainOrgId, roomKey, () =>
    chatRepo.createConversation({
      organizationId: input.chainOrgId,
      conversationType: "CHAIN_PARTNER",
      title: input.title,
      createdBy: input.createdBy,
      participantUserIds: [],
      counterpartOrgId: input.partnerOrgId,
      roomKey,
      metadata: { partnerOrgId: input.partnerOrgId },
    })
  )
}

export async function ensureBranchConversation(
  chatRepo: IInternalChatRepository,
  input: { organizationId: string; branchId: string; title: string; createdBy: string }
): Promise<InternalChatConversation> {
  const roomKey = branchRoomKey(input.branchId)
  return ensureRoom(chatRepo, input.organizationId, roomKey, () =>
    chatRepo.createConversation({
      organizationId: input.organizationId,
      conversationType: "CHAIN_BRANCH",
      title: input.title,
      createdBy: input.createdBy,
      participantUserIds: [],
      branchId: input.branchId,
      roomKey,
    })
  )
}

async function ensureRoom(
  chatRepo: IInternalChatRepository,
  organizationId: string,
  roomKey: string,
  create: () => Promise<InternalChatConversation>
): Promise<InternalChatConversation> {
  const existing = await chatRepo.findConversationByRoomKey(organizationId, roomKey)
  if (existing) return existing
  try {
    return await create()
  } catch (error) {
    const raced = await chatRepo.findConversationByRoomKey(organizationId, roomKey)
    if (raced) return raced
    throw error
  }
}
