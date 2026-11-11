import type { InternalChatConversation } from "../domain/chat-entities"

/** Cổng gửi thông báo của chat nội bộ — triển khai ở `infra/chat-notifier.ts` (notifyOrganization, best-effort). */
export interface IChatNotifier {
  /** Thẻ mời nhận đơn gia công vừa đăng vào phòng chung (không gộp — có hạn nhận). */
  orderInvite(input: { chainOrgId: string; partnerOrgId: string; orderCode: string }): Promise<void>
  /** Tin chữ mới: báo bên KIA của phòng (gộp theo phòng). Phòng trong một tổ chức không báo. */
  messageReceived(input: { conversation: InternalChatConversation; senderOrgId: string; preview: string }): Promise<void>
}

/** Đường dẫn mở đúng phòng theo phía người nhận. */
export function roomLinkFor(conversation: Pick<InternalChatConversation, "id" | "organizationId">, recipientOrgId: string): string {
  return recipientOrgId === conversation.organizationId ? `/tin-nhan?phong=${conversation.id}` : `/tin-nhan?chuoi=${conversation.organizationId}`
}
