/**
 * PATCH /api/v1/leads/[id] — đổi trạng thái chăm sóc / người phụ trách.
 * Q3: Cập nhật hồ sơ khách hàng.
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import { updateLeadBody } from "@/app/api/v1/_contracts/requests-marketing"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "Q3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = updateLeadBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ body: "Dữ liệu không hợp lệ" })
    return jsonResponse(await updateLead(ctx, id, parsed.data))
  },
})
