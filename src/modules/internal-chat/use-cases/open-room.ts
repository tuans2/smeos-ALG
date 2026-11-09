import type { IChatLinkPolicy, IInternalChatRepository } from "../domain/chat-repository.interface"
import type { InternalChatConversation } from "../domain/chat-entities"
import { ChatAccessDeniedError } from "../domain/errors"
import type { ChatCaller } from "./conversation-access"
import { ensureBranchConversation, ensurePartnerConversation } from "./ensure-room"

export interface IChatRoomDirectory {
  organizationName(organizationId: string): Promise<string | null>
  /** Chi nhánh đang hoạt động của tổ chức; khác tổ chức / không có → null */
  branchName(organizationId: string, branchId: string): Promise<string | null>
}

export type RoomTarget = { partnerOrgId: string } | { chainOrgId: string } | { branchId: string }

/**
 * Nút "Nhắn tin" (IC-2.6): mở — hoặc tạo lần đầu — phòng của đúng một cặp.
 * - Chuỗi mở phòng với cửa hàng đối tác (`partnerOrgId`); cửa hàng mở phòng với chuỗi (`chainOrgId`). Phòng luôn
 *   thuộc tổ chức chuỗi, cửa hàng là bên kia. Liên kết phải còn hiệu lực (ACTIVE; tạm dừng vẫn mở để xem lại).
 * - Phòng chi nhánh nội bộ (`branchId`): chi nhánh của chính tổ chức; nhân viên gắn chi nhánh chỉ mở được chi nhánh mình.
 * Sai mọi điều kiện → 404.
 */
export async function openRoom(
  deps: { chatRepo: IInternalChatRepository; linkPolicy: IChatLinkPolicy; directory: IChatRoomDirectory },
  caller: ChatCaller,
  target: RoomTarget
): Promise<InternalChatConversation> {
  if ("branchId" in target) {
    if (caller.branchId && caller.branchId !== target.branchId) throw new ChatAccessDeniedError()
    const name = await deps.directory.branchName(caller.organizationId, target.branchId)
    if (!name) throw new ChatAccessDeniedError()
    return ensureBranchConversation(deps.chatRepo, { organizationId: caller.organizationId, branchId: target.branchId, title: `Trao đổi: ${name}`, createdBy: caller.userId })
  }

  const chainOrgId = "partnerOrgId" in target ? caller.organizationId : target.chainOrgId
  const partnerOrgId = "partnerOrgId" in target ? target.partnerOrgId : caller.organizationId
  if (chainOrgId === partnerOrgId) throw new ChatAccessDeniedError()
  // Nhân viên gắn chi nhánh không mở phòng với đối tác thay cho cả chuỗi
  if ("partnerOrgId" in target && caller.branchId) throw new ChatAccessDeniedError()
  const state = await deps.linkPolicy.linkState(chainOrgId, partnerOrgId)
  if (state === "OTHER") throw new ChatAccessDeniedError()
  const partnerName = await deps.directory.organizationName(partnerOrgId)
  return ensurePartnerConversation(deps.chatRepo, {
    chainOrgId,
    partnerOrgId,
    title: `Trao đổi: ${partnerName ?? "cửa hàng đối tác"}`,
    createdBy: caller.userId,
  })
}
