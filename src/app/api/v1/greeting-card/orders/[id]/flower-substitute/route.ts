import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { flowerSubstituteOptions, proposeFlowerSubstitute } from "@/modules/greeting-card/use-cases/flower-substitute"
import { flowerSubstituteBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/greeting-card/orders/[id]/flower-substitute — các dòng hoa phụ trong công thức của đơn
 * và đề xuất đổi hoa gần nhất (R3 order.update, checklist ALG 5.14).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderUpdate },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await flowerSubstituteOptions(ctx, id) })
  },
})

/**
 * POST /api/v1/greeting-card/orders/[id]/flower-substitute — thiếu một loại hoa phụ: gửi khách ảnh hoa
 * thay thế do tiệm chụp và lý do; khách đồng ý/không trên trang theo dõi (R3 order.update).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderUpdate },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = flowerSubstituteBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await proposeFlowerSubstitute(ctx, id, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
