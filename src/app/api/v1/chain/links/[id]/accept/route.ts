import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { respondToChainLink } from "@/modules/chain-partnership/use-cases/manage-chain-links"

/** `POST /chain/links/:id/accept` (F2) — cửa hàng đồng ý lời mời liên kết của chuỗi (UJ-10). Liên kết của tổ chức khác → 404. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ ctx, params }) => {
    const link = await respondToChainLink(ctx, params.id ?? "", "ACTIVE", null)
    return jsonResponse({ data: { id: link.id, status: link.status } })
  },
})
