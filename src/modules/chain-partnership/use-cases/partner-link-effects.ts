import { asSystemDb } from "@/core/tenancy/db-context"
import { log } from "@/core/observability/log"
import { PartnerDispatchCandidateRepository } from "@/modules/greeting-card/infra/partner-dispatch-candidate-repository"
import { syncPartnerDispatchCandidate } from "@/modules/greeting-card/use-cases/sync-partner-dispatch-candidate"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import type { IInternalChatRepository } from "@/modules/internal-chat/domain/repositories/chat-repository.interface"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { ensurePartnerConversation } from "@/modules/internal-chat/use-cases/ensure-room"
import type { PartnershipStatus } from "../domain/partnership-entities"

export interface PartnerLinkChange {
  chainOrgId: string
  partnerOrgId: string
  status: PartnershipStatus
  /** Người làm thay đổi (ghi `created_by` của phòng khi phải tạo) */
  actorUserId: string
  /** Tên hiển thị của phòng khi phải tạo — tên cửa hàng (và mã đối tác) */
  roomTitle: string
}

/**
 * Hệ quả của việc liên kết chuỗi → cửa hàng đổi trạng thái (kế hoạch chat nội bộ IC-2.2, IC-3.1):
 * 1. cửa hàng vào / ra vòng bắn đơn của chuỗi (dòng ứng viên `branches.partner_org_id`, D9, D7);
 * 2. liên kết hiệu lực (ACTIVE, hoặc SUSPENDED vẫn cần xem lại lịch sử) thì phải có phòng trao đổi.
 * Liên kết đã đổi xong trước khi gọi; lỗi ở đây chỉ ghi log (không dữ liệu cá nhân) — chạy lại backfill sẽ bù.
 */
export async function applyPartnerLinkEffects(
  change: PartnerLinkChange,
  chatRepo: IInternalChatRepository = getInternalChatRepository()
): Promise<void> {
  try {
    // Ghi dòng ứng viên của TỔ CHỨC CHUỖI kể cả khi cửa hàng là bên đổi (cửa hàng đồng ý / rời chuỗi) — quyền hệ thống
    // có lý do: chuyển trạng thái liên kết đã được kiểm quyền ở use-case gọi hàm này.
    await asSystemDb("chain-link: đồng bộ cửa hàng đối tác vào vòng bắn đơn", () =>
      syncPartnerDispatchCandidate(
        { chainOrgId: change.chainOrgId, partnerOrgId: change.partnerOrgId, status: change.status },
        {
          store: new PartnerDispatchCandidateRepository(),
          notifyStuck: async (organizationId, message) => {
            await notifyOrganization({ organizationId, eventKey: "CHAIN_ORDER_STUCK", message, deepLink: "/dieu-phoi" })
          },
        }
      )
    )
  } catch (error) {
    log.warn("chain_link.partner_candidate_sync_failed", {
      organizationId: change.chainOrgId,
      partnerOrgId: change.partnerOrgId,
      error: error instanceof Error ? error.name : "unknown",
    })
  }

  if (change.status !== "ACTIVE" && change.status !== "SUSPENDED") return
  try {
    await ensurePartnerConversation(chatRepo, {
      chainOrgId: change.chainOrgId,
      partnerOrgId: change.partnerOrgId,
      title: change.roomTitle,
      createdBy: change.actorUserId,
    })
  } catch (error) {
    log.warn("internal_chat.partner_room_create_failed", {
      organizationId: change.chainOrgId,
      partnerOrgId: change.partnerOrgId,
      error: error instanceof Error ? error.name : "unknown",
    })
  }
}
