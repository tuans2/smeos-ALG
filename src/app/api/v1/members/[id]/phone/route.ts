import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { setMemberPhone } from "@/modules/organization/use-cases/staff-accounts"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { memberPhoneBody } from "@/app/api/v1/_contracts/requests-org"

/** `PUT /members/:id/phone` (`A3`) — Điều hành sửa số điện thoại nhân viên (Shipper được gắn đơn qua số này). */
export const PUT = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "A3")
  const { id } = await context.params
  const parsed = memberPhoneBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await setMemberPhone(ctx, id, parsed.data.phone) })
})
