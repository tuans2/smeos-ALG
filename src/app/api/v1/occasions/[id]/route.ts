import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateOccasion } from "@/modules/organization/use-cases/update-occasion"
import { updateOccasionBody } from "@/app/api/v1/_contracts/requests-marketing"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx, params }) => {
    const parsed = updateOccasionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    if (Object.keys(input).length === 0) {
      throw validationFailed({ body: "Không có trường nào để sửa" })
    }

    const { id } = params as { id: string }
    const occasion = await updateOccasion(ctx, id, input)
    return jsonResponse({ occasion })
  },
})
