/** DELETE /api/v1/platform/marketplace/share-links/:id — huỷ link chia sẻ ngay lập tức (`N17`). */
import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { revokeShareLink } from "@/modules/platform/use-cases/share-partner-marketplace"
import { defineRoute } from "@/core/http/define-route"

const UUID = /^[0-9a-f-]{36}$/i

export const DELETE = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx, params }) => {
    const { id } = params as { id: string }
    if (!UUID.test(id)) throw notFound()
    return jsonResponse({ data: await revokeShareLink(pctx, id) })
  },
})

export const dynamic = "force-dynamic"
