import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { createBrandLibraryBody } from "@/app/api/v1/_contracts/requests-brand"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createBrandLibraryItem, listBrandLibrary } from "@/modules/profiles/use-cases/brand-library"

/** Công cụ 45 — thư viện nhận diện thương hiệu của tổ chức hiện tại. */

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  const includeArchived = new URL(request.url).searchParams.get("include_archived") === "true"
  return jsonResponse({ data: await listBrandLibrary(ctx, { includeArchived }) })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const parsed = createBrandLibraryBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const item = await createBrandLibraryItem(ctx, {
    title: d.title, category: d.category, description: d.description ?? null,
    assetId: d.asset_id ?? null, textValue: d.text_value ?? null, note: d.note ?? null,
  })
  return jsonResponse({ data: item }, { status: 201 })
})
