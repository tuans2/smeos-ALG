/**
 * PATCH /api/v1/short-links/[id] — đổi đích, tên, vị trí đặt, hạn, bật/tắt. Mã đã in giữ nguyên.
 * J1: Tạo catalog.
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateShortLink } from "@/modules/acquisition/use-cases/manage-short-links"
import { shortLinkBodySchema } from "../schema"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = shortLinkBodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ body: "Dữ liệu không hợp lệ" })
    return jsonResponse(await updateShortLink(ctx, id, parsed.data))
  },
})
