import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { brandLibraryVersionBody } from "@/app/api/v1/_contracts/requests-brand"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { addBrandLibraryVersion } from "@/modules/profiles/use-cases/brand-library"

/** Thêm phiên bản mới; phiên bản cũ giữ nguyên để xem lại. */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const parsed = brandLibraryVersionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const item = await addBrandLibraryVersion(ctx, (await context.params).id, {
    assetId: parsed.data.asset_id ?? null, textValue: parsed.data.text_value ?? null, note: parsed.data.note ?? null,
  })
  return jsonResponse({ data: item }, { status: 201 })
})
