import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { flowerSubstituteOptions, proposeFlowerSubstitute } from "@/modules/greeting-card/use-cases/flower-substitute"
import { flowerSubstituteBody } from "@/app/api/v1/_contracts/requests-greeting-orders"

/**
 * GET /api/v1/greeting-card/orders/[id]/flower-substitute — các dòng hoa phụ trong công thức của đơn
 * và đề xuất đổi hoa gần nhất (R3 order.update, checklist ALG 5.14).
 */
export const GET = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderUpdate)
  const { id } = await context.params
  return jsonResponse({ data: await flowerSubstituteOptions(ctx, id) })
})

/**
 * POST /api/v1/greeting-card/orders/[id]/flower-substitute — thiếu một loại hoa phụ: gửi khách ảnh hoa
 * thay thế do tiệm chụp và lý do; khách đồng ý/không trên trang theo dõi (R3 order.update).
 */
export const POST = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.orderUpdate)
  const { id } = await context.params
  const parsed = flowerSubstituteBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await proposeFlowerSubstitute(ctx, id, parsed.data) }, { status: 201 })
})

export const dynamic = "force-dynamic"
