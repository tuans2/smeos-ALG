import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { proposeSubstitute, substituteOptions } from "@/modules/greeting-card/use-cases/substitute"
import { substituteBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/greeting-card/orders/[id]/substitute — mẫu đang đặt, các mẫu còn bán trong cùng bộ
 * sưu tập để thay, đề xuất gần nhất (R3 order.update).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderUpdate },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await substituteOptions(ctx, id) })
  },
})

/**
 * POST /api/v1/greeting-card/orders/[id]/substitute — tiệm không làm được mẫu khách chọn, đề xuất
 * 1–3 mẫu thay thế kèm lý do; khách trả lời trên trang theo dõi (R3 order.update).
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderUpdate },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = substituteBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await proposeSubstitute(ctx, id, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
