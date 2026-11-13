import { jsonResponse } from "@/core/http/response"
import { revokeCatalogLink } from "@/modules/catalog-links/use-cases/revoke-catalog-link"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /catalog-links/:slug/revoke` — không đổi. `PATCH` từng nằm nhầm ở
 * tệp này đã dời về `[slug]/route.ts` (soát 18/09, nhân lúc làm RS-3).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J2" },
  handler: async ({ ctx, params }) => {
      const { slug } = params as { slug: string }
      await revokeCatalogLink(ctx, slug)
      return jsonResponse({ revoked: true })
  },
})
