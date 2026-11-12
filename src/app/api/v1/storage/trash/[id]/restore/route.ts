import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { restoreSchema } from "@/app/api/v1/_contracts/requests-storage"
import { restoreFromTrash } from "@/modules/storage/use-cases/manage-trash"
import { defineRoute } from "@/core/http/define-route"

type Context = { params: Promise<{ id: string }> }

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: restoreFromTrash" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => ({}))
    const parsed = restoreSchema.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    await restoreFromTrash(ctx, { id, type: parsed.data.type })
    return jsonResponse({ success: true })
  },
})
