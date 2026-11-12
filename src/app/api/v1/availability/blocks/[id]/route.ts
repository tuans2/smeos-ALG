import { jsonResponse } from "@/core/http/response"
import { notFound } from "@/core/http/errors"
import { removeManualBlock } from "@/modules/availability/use-cases/manage-manual-block"
import { defineRoute } from "@/core/http/define-route"

/**
 * DELETE /api/v1/availability/blocks/[id]
 * Xóa block thủ công (mở lại phòng/ngày).
 */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const removed = await removeManualBlock(ctx.organizationId, id)
    if (!removed) throw notFound()

    return jsonResponse({ success: true })
  },
})

export const dynamic = "force-dynamic"
