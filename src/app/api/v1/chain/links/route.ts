import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { listStoreChainLinks } from "@/modules/chain-partnership/use-cases/manage-chain-links"
import type { StoreSideLink } from "@/modules/chain-partnership/infra/chain-invitation-repository"

const view = (l: StoreSideLink) => ({
  id: l.id,
  chain_name: l.chainName,
  partner_code: l.partnerCode,
  status: l.status,
  valid_from: l.validFrom.toISOString(),
})

/** `GET /chain/links` (F2) — lời mời liên kết đang chờ và chuỗi cửa hàng đang tham gia (phía cửa hàng, UJ-10). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ ctx }) => {
    const links = await listStoreChainLinks(ctx)
    return jsonResponse({ data: { invitations: links.invitations.map(view), memberships: links.memberships.map(view) } })
  },
})
