import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createWorkspace } from "@/modules/organization/use-cases/create-workspace"
import { listWorkspaces } from "@/modules/organization/use-cases/list-workspaces"
import { createWorkspaceBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await listWorkspaces(ctx), next_cursor: null })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F8" },
  handler: async ({ request, ctx }) => {
    const parsed = createWorkspaceBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const workspace = await createWorkspace(ctx, parsed.data)
    return jsonResponse({ workspace }, { status: 201 })
  },
})
