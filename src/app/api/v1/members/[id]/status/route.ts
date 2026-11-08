import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { setMemberActive } from "@/modules/organization/use-cases/staff-accounts"
import { memberStatusBody } from "@/app/api/v1/_contracts/requests-org"

/** `PATCH /members/:id/status` (`A5`, trần cứng Điều hành): tạm khoá (đăng xuất ngay) hoặc mở lại tài khoản. */
export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "A5")
  const parsed = memberStatusBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  return jsonResponse({ data: await setMemberActive(ctx, id, parsed.data.active) })
})
