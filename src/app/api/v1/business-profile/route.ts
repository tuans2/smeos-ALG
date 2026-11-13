
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { putBusinessProfileBody } from "@/app/api/v1/_contracts/requests-profile"
import { getBusinessProfile } from "@/modules/profiles/use-cases/get-business-profile"
import { putBusinessProfile } from "@/modules/profiles/use-cases/put-business-profile"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getBusinessProfile(ctx))
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = putBusinessProfileBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await putBusinessProfile(ctx, parsed.data))
  },
})
