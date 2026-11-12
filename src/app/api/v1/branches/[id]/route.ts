import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateBranchBody } from "@/app/api/v1/_contracts/requests-chain"
import { updateBranch } from "@/modules/organization/use-cases/update-branch"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F7" },
  handler: async ({ request, ctx, params }) => {
    const parsed = updateBranchBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    if (Object.keys(parsed.data).length === 0) {
      throw validationFailed({ body: "Không có trường nào để sửa" })
    }

    const { id } = params as { id: string }
    const branch = await updateBranch(ctx, id, parsed.data)
    return jsonResponse({ branch })
  },
})
