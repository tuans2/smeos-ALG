import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createRole } from "@/modules/organization/use-cases/create-role"
import { listRoles } from "@/modules/organization/use-cases/list-roles"
import { createRoleBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listRoles(ctx), next_cursor: null })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F5" },
  handler: async ({ request, ctx }) => {
    const parsed = createRoleBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const role = await createRole(ctx, { name: parsed.data.name })
    return jsonResponse({ role }, { status: 201 })
  },
})
