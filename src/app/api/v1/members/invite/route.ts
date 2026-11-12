import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { inviteMember } from "@/modules/organization/use-cases/invite-member"
import { inviteMemberBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F3" },
  handler: async ({ request, ctx }) => {
    const parsed = inviteMemberBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const membership = await inviteMember(ctx, {
      email: parsed.data.email,
      roleId: parsed.data.role_id,
      branchId: parsed.data.branch_id ?? null,
    })
    return jsonResponse({ membership }, { status: 201 })
  },
})
