import { withTenantDb } from "@/core/tenancy/db-context"
import { publicAppUrl } from "@/lib/public-url"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import type { MessagePageDecorator } from "../use-cases/get-conversation-messages"
import { attachSubcontractViews } from "../use-cases/subcontract-card-views"
import { PrismaSubcontractCardSource } from "./prisma-subcontract-card-source"

/**
 * Gắn trạng thái thật vào thẻ đơn gia công của trang tin. Đơn thuộc tổ chức chủ phòng (chuỗi) nên đọc trong ngữ cảnh
 * CSDL của chuỗi — chỉ sau khi `assertConversationAccess` đã cho người xem vào phòng, và chỉ đọc đúng các đơn có thẻ
 * trong phòng đó. Link Thẻ Gia Công ký theo khoá sẵn có (`subcontract-link-token.ts`), dùng URL công khai cấu hình.
 */
export function subcontractCardDecorator(viewer: { canFulfil: boolean }): MessagePageDecorator {
  return async (items, conversation, caller) => {
    if (!items.some((m) => m.messageType === "ACTION_CARD_SUBCONTRACT")) return items
    const chainOrgId = conversation.organizationId
    return withTenantDb(chainOrgId, () =>
      attachSubcontractViews(items, {
        chainOrgId,
        viewer: { organizationId: caller.organizationId, canFulfil: viewer.canFulfil },
        source: new PrismaSubcontractCardSource(),
        sign: ({ orderCode, branchCode }) => subcontractBranchUrl({ baseUrl: publicAppUrl(), organizationId: chainOrgId, orderCode, branchId: branchCode }),
      })
    )
  }
}
