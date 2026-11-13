import { z } from "zod"
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import { withoutSunsetFields } from "@/modules/integration/domain/integration-field-sunset"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { updateCatalogLink } from "@/modules/catalog-links/use-cases/update-catalog-link"
import type { CatalogLinkFilters } from "@/modules/catalog-links/domain/catalog-link-rules"
import { defineRoute } from "@/core/http/define-route"

/** `PATCH /integration/catalog-links/:slug` (RS-3 18/09) — xem route cha. */
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const PATCH = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic, params }) => {
      const ctx = await toTenantContext(ic)
      requireCapability(ctx, "J1")

      const { slug } = params as { slug: string }
      const parsed = patchSchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

      const updateInput: { name?: string; description?: string | null; filters?: CatalogLinkFilters | null } = {}
      if (parsed.data.name !== undefined) updateInput.name = parsed.data.name
      if (parsed.data.description !== undefined) updateInput.description = parsed.data.description
      if (parsed.data.filters !== undefined) updateInput.filters = parsed.data.filters

      const link = await updateCatalogLink(ctx, slug, updateInput)
      return jsonResponse(withoutSunsetFields("catalogLink", link, new Date()))
  },
})
