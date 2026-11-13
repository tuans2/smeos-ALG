import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { changeMemberRole } from "@/modules/organization/use-cases/change-member-role"
import { memberRoleBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F5" },
  handler: async ({ request, ctx, params }) => {
    const parsed = memberRoleBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const { id } = params as { id: string }
    const membership = await changeMemberRole(ctx, id, parsed.data.role_id)
    return jsonResponse({ membership })
  },
})
