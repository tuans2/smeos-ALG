import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { moveTrashSchema } from "@/app/api/v1/_contracts/requests-storage"
import { getTrashList, moveToTrash } from "@/modules/storage/use-cases/manage-trash"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getTrashList" },
  handler: async ({ ctx }) => {
    const items = await getTrashList(ctx)
    return jsonResponse({ data: items })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: moveToTrash" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => ({}))
    const parsed = moveTrashSchema.safeParse(body)
    if (!parsed.success) {
      throw validationFailed({ issues: parsed.error.issues })
    }

    await moveToTrash(ctx, parsed.data)
    return jsonResponse({ success: true })
  },
})
