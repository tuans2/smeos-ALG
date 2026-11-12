import { requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { revokeCatalogLink } from "@/modules/catalog-links/use-cases/revoke-catalog-link"
import { defineRoute } from "@/core/http/define-route"

/** `POST /integration/catalog-links/:slug/revoke` (RS-3 18/09) — xem route cha (`J2`, giống route phiên). */
export const POST = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ ic, params }) => {
      const ctx = await toTenantContext(ic)
      requireCapability(ctx, "J2")

      const { slug } = params as { slug: string }
      await revokeCatalogLink(ctx, slug)
      return jsonResponse({ revoked: true })
  },
})
