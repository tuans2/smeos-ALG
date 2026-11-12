import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createBranchBody } from "@/app/api/v1/_contracts/requests-chain"
import { createBranch } from "@/modules/organization/use-cases/create-branch"
import { listBranches } from "@/modules/organization/use-cases/list-branches"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F6" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listBranches(ctx), next_cursor: null })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F7" },
  handler: async ({ request, ctx }) => {
    const parsed = createBranchBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const branch = await createBranch(ctx, {
      name: parsed.data.name,
      code: parsed.data.code,
      address: parsed.data.address ?? null,
    })
    return jsonResponse({ branch }, { status: 201 })
  },
})
