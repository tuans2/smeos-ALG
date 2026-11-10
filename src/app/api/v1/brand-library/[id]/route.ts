import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { patchBrandLibraryBody } from "@/app/api/v1/_contracts/requests-brand"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getBrandLibraryItem, updateBrandLibraryItem } from "@/modules/profiles/use-cases/brand-library"

type Ctx = { params: Promise<{ id: string }> }

export const GET = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse({ data: await getBrandLibraryItem(ctx, (await context.params).id) })
})

export const PATCH = handle<[Ctx]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const parsed = patchBrandLibraryBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const item = await updateBrandLibraryItem(ctx, (await context.params).id, {
    ...(d.title !== undefined ? { title: d.title } : {}),
    ...(d.description !== undefined ? { description: d.description ?? null } : {}),
    ...(d.share_with_members !== undefined ? { share_with_members: d.share_with_members } : {}),
    ...(d.status !== undefined ? { status: d.status } : {}),
  })
  return jsonResponse({ data: item })
})
