import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { countUnreadMessages } from "@/modules/internal-chat/use-cases/list-user-conversations"

/** GET /api/v1/internal-chat/unread (S1) — tổng tin chưa đọc trong các phòng của người xem, cho số đếm trên menu. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  handler: async ({ ctx }) =>
    ok({ unread_count: await countUnreadMessages(getInternalChatRepository(), { userId: ctx.userId, organizationId: ctx.organizationId, branchId: ctx.branchId }) }),
})
