import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { PrismaPartnerOrderStats } from "@/modules/internal-chat/infra/prisma-partner-order-stats"

const WINDOW_DAYS = 30

/**
 * GET /api/v1/internal-chat/stats (S1) — 30 ngày qua của tổ chức người xem (là chuỗi): số lời mời đơn đăng vào Trao
 * đổi nội bộ, số đơn cửa hàng đối tác đã nhận, số cửa hàng đối tác đang trong vòng bắn đơn (IC-6.3). Tổ chức không có
 * cửa hàng đối tác → toàn 0. Chỉ số đếm.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "S1" },
  handler: async ({ ctx }) => {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const s = await new PrismaPartnerOrderStats().chatDispatchStats(ctx.organizationId, since)
    return ok({ days: WINDOW_DAYS, invites_in_chat: s.invitesInChat, partner_claims: s.partnerClaims, partner_stores: s.partnerStores })
  },
})
