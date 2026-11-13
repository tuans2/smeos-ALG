import { defineRoute } from "@/core/http/define-route"
import { leaveChainBody } from "@/app/api/v1/_contracts/requests-chain"
import { jsonResponse } from "@/core/http/response"
import { respondToChainLink } from "@/modules/chain-partnership/use-cases/manage-chain-links"

/** `POST /chain/links/:id/leave` (F2) — cửa hàng tự rời chuỗi (chấm dứt liên kết), bắt buộc lý do (UJ-10). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  body: leaveChainBody,
  handler: async ({ ctx, params, body: b }) => {
    const link = await respondToChainLink(ctx, params.id ?? "", "TERMINATED", b.reason)
    return jsonResponse({ data: { id: link.id, status: link.status } })
  },
})
