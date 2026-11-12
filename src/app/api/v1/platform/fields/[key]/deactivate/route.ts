/** POST /api/v1/platform/fields/:key/deactivate (`N12`, ĐP-3 3.13). */
import { jsonResponse } from "@/core/http/response"
import { deactivateField } from "@/modules/field-platform/use-cases/deactivate-field"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx, params }) => {
    const { key } = params as { key: string }
    return jsonResponse({ data: await deactivateField(pctx, key) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
