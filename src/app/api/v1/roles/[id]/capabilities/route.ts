import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateRoleCapabilities } from "@/modules/organization/use-cases/update-role-capabilities"
import { updateRoleCapabilitiesBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

/**
 * Yêu cầu bật một mã bị trần cứng chặn trả 403 và không ghi gì (đặc tả 06
 * mục 4) — `updateRoleCapabilities` kiểm hết mọi thay đổi trước khi ghi bất
 * kỳ thay đổi nào.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F5" },
  handler: async ({ request, ctx, params }) => {
    const parsed = updateRoleCapabilitiesBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { id } = params as { id: string }
    const capabilities = await updateRoleCapabilities(ctx, id, parsed.data.changes)
    return jsonResponse({ capabilities })
  },
})
