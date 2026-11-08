import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { decideOrderChange } from "@/modules/greeting-card/use-cases/order-change"
import { changeDecisionBody } from "@/app/api/v1/_contracts/requests-greeting"

/**
 * POST /api/v1/greeting-card/change-requests/[id]/decision — duyệt/từ chối yêu cầu đổi
 * thông tin đơn của khách (R3 order.update). Duyệt thì đơn cập nhật ngay, lưu lịch sử.
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderUpdate)
  const { id } = await context.params
  const parsed = changeDecisionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await decideOrderChange(ctx, { requestId: id, ...parsed.data }) })
})
