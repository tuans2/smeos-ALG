import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { updateLinkCustomer } from "@/modules/greeting-card/use-cases/link-customer"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { linkCustomerBody } from "@/app/api/v1/_contracts/requests-greeting"

/** PATCH /api/v1/greeting-card/send-links/[id]/customer — ghi tên/SĐT khách lên link chưa có đơn. */
export const PATCH = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const parsed = linkCustomerBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  return jsonResponse({ data: await updateLinkCustomer(ctx, id, parsed.data) })
})
