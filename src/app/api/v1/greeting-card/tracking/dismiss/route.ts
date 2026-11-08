import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { proposeDismissal } from "@/modules/greeting-card/use-cases/propose-dismissal"
import { dismissBody } from "@/app/api/v1/_contracts/requests-greeting"

/**
 * POST /api/v1/greeting-card/tracking/dismiss
 * Sale/Điều phối (R1) đề xuất; người có R6 (Điều hành) bỏ hiển thị trực tiếp đơn/link chưa thanh toán.
 */
export const POST = handle(async (req: Request) => {
  const { ctx } = await requireTenantContext(req)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderRead)

  const body = await req.json().catch(() => null)
  const parsed = dismissBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const result = await proposeDismissal(ctx, parsed.data)
  return jsonResponse({ data: result }, { status: 200 })
})
