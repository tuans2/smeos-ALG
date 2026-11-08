import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { decideDiscount } from "@/modules/greeting-card/use-cases/discount-requests"
import { discountDecisionBody } from "@/app/api/v1/_contracts/requests-greeting"

/** POST /api/v1/greeting-card/discount-requests/[id]/decision — Điều hành duyệt/từ chối (F2). */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.integrationManage)
  const { id } = await context.params
  const parsed = discountDecisionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { approve, note, percent, amountVnd } = parsed.data
  const ask = percent !== undefined || amountVnd !== undefined ? { percent, amountVnd } : undefined
  return jsonResponse({ data: await decideDiscount(ctx, { requestId: id, approve, ask, note }) })
})
