/** DELETE /api/v1/platform/marketplace/stores/:id — xoá hồ sơ cửa hàng khỏi chợ đối tác (`N18`, chỉ superadmin). */
import { notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { deleteMarketplaceStore } from "@/modules/platform/use-cases/delete-partner-marketplace-store"
import { defineRoute } from "@/core/http/define-route"

const UUID = /^[0-9a-f-]{36}$/i

export const DELETE = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx, params }) => {
    const { id } = params as { id: string }
    if (!UUID.test(id)) throw notFound()
    return jsonResponse({ data: await deleteMarketplaceStore(pctx, id) })
  },
})

export const dynamic = "force-dynamic"
