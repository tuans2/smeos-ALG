import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { updateCurrentOrganization } from "@/modules/organization/use-cases/update-current-organization"
import { patchOrganizationBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getCurrentOrganization(ctx))
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = patchOrganizationBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await updateCurrentOrganization(ctx, parsed.data))
  },
})
