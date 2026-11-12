/** GET /api/v1/platform/catalogs (`N12`, ĐP-3 3.13) — mọi danh mục kèm giá trị. */
import { jsonResponse } from "@/core/http/response"
import { listCatalogs } from "@/modules/field-platform/use-cases/list-catalogs"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await listCatalogs(pctx) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
