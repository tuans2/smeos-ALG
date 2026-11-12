
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { putBrandProfileBody } from "@/app/api/v1/_contracts/requests-profile"
import { getBrandProfile } from "@/modules/profiles/use-cases/get-brand-profile"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getBrandProfile(ctx))
  },
})


export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = putBrandProfileBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await putBrandProfile(ctx, parsed.data))
  },
})
