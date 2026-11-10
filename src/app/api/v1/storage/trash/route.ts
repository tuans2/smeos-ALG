import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { moveTrashSchema } from "@/app/api/v1/_contracts/requests-storage"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getTrashList, moveToTrash } from "@/modules/storage/use-cases/manage-trash"

export const GET = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  const items = await getTrashList(ctx)
  return jsonResponse({ data: items })
})

export const POST = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  const body = await request.json().catch(() => ({}))
  const parsed = moveTrashSchema.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  await moveToTrash(ctx, parsed.data)
  return jsonResponse({ success: true })
})
