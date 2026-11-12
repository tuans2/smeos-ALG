import { z } from "zod"

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listCatalogLinks } from "@/modules/catalog-links/use-cases/list-catalog-links"
import { createCatalogLink } from "@/modules/catalog-links/use-cases/create-catalog-link"
import { defineRoute } from "@/core/http/define-route"

const querySchema = z.object({
  include_revoked: z.coerce.boolean().optional(),
})

const createSchema = z.object({
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  filters: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const links = await listCatalogLinks(ctx, { includeRevoked: parsed.data.include_revoked ?? false })
    return jsonResponse({ data: links })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx }) => {
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const link = await createCatalogLink(ctx, {
      slug: parsed.data.slug ?? null,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      filters: parsed.data.filters ?? null,
    })

    return jsonResponse({ data: link }, { status: 201 })
  },
})