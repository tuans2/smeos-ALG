/** POST /api/v1/platform/catalogs/:key/values (`N12`, ĐP-3 3.13) — thêm giá trị mới. */
import { jsonResponse } from "@/core/http/response"
import { upsertCatalogValue } from "@/modules/field-platform/use-cases/upsert-catalog-value"
import { upsertCatalogValueSchema, parseBody } from "@/modules/field-platform/adapters/http-schemas"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    const { key } = params as { key: string }
    const body = await parseBody(request, upsertCatalogValueSchema)
    return jsonResponse({ data: await upsertCatalogValue(pctx, { catalogKey: key, ...body }) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
