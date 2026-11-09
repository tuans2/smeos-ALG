import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { ChatNotifyThrottle } from "../domain/chat-notify-throttle"
import { roomLinkFor, type IChatNotifier } from "../use-cases/chat-notifier"

const throttle = new ChatNotifyThrottle()
const PREVIEW_MAX = 120

/**
 * Thông báo của Trao đổi nội bộ qua hệ thông báo 4 tầng (sự kiện `INTERNAL_CHAT_ORDER_INVITE`, `INTERNAL_CHAT_MESSAGE`).
 * Không chờ, không ném lỗi về luồng gửi tin. Gộp tin nhắn giữ trong bộ nhớ tiến trình — nhiều instance có thể gửi
 * thêm một thông báo, không mất thông báo.
 */
export class OrganizationChatNotifier implements IChatNotifier {
  constructor(private readonly notify: typeof notifyOrganization = notifyOrganization) {}

  async orderInvite(input: { chainOrgId: string; partnerOrgId: string; orderCode: string }): Promise<void> {
    void this.notify({
      organizationId: input.partnerOrgId,
      eventKey: "INTERNAL_CHAT_ORDER_INVITE",
      title: `Đơn gia công mới #${input.orderCode}`,
      message: `Chuỗi mời cửa hàng nhận đơn #${input.orderCode}. Mở Trao đổi nội bộ để xem và nhận đơn trước khi hết hạn.`,
      deepLink: `/tin-nhan?chuoi=${input.chainOrgId}`,
    })
  }

  async messageReceived(input: Parameters<IChatNotifier["messageReceived"]>[0]): Promise<void> {
    const { conversation, senderOrgId } = input
    if (!conversation.counterpartOrgId) return
    const recipientOrgId = senderOrgId === conversation.organizationId ? conversation.counterpartOrgId : conversation.organizationId
    if (recipientOrgId === senderOrgId || !throttle.take(`${conversation.id}:${recipientOrgId}`, Date.now())) return
    const preview = input.preview.length > PREVIEW_MAX ? `${input.preview.slice(0, PREVIEW_MAX)}…` : input.preview
    void this.notify({
      organizationId: recipientOrgId,
      eventKey: "INTERNAL_CHAT_MESSAGE",
      title: "Tin nhắn trao đổi nội bộ mới",
      message: preview,
      deepLink: roomLinkFor(conversation, recipientOrgId),
    })
  }
}
