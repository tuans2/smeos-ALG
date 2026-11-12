import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { createOrderSchema, listQuerySchema, parseBody } from "@/modules/coordinator/adapters/http-schemas"
import type { CoordinatorStage } from "@/modules/coordinator/domain/coordinator-types"
import { createCoordinatorOrder } from "@/modules/coordinator/use-cases/create-coordinator-order"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { listCoordinatorOrders } from "@/modules/coordinator/use-cases/list-coordinator-orders"
import { defineRoute } from "@/core/http/define-route"

/** `GET /api/v1/coordinator/orders` (R1) — danh sách Control Tower, rủi ro tính lại lúc đọc (F03/F12). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const query = listQuerySchema.safeParse({
      stage: url.searchParams.get("stage") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    })
    if (!query.success) throw validationFailed({ issues: query.error.issues })

    const orders = await listCoordinatorOrders(ctx, {
      stage: query.data.stage as CoordinatorStage | undefined,
      limit: query.data.limit,
    })
    return jsonResponse({ orders })
  },
})

/** `POST /api/v1/coordinator/orders` (R2) — tiếp nhận đơn (F01). Mã đơn do máy chủ cấp. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R2" },
  handler: async ({ request, ctx }) => {
    const body = await parseBody(request, createOrderSchema)
    const order = await createCoordinatorOrder(ctx, body)
    // Đơn thiếu lời chúc (đơn có thiệp) hoặc thông tin người nhận → tự sinh yêu cầu bổ sung (checklist ALG 4.14)
    await syncOrderInfoRequests(ctx, order.id)
    return jsonResponse({ order }, { status: 201 })
  },
})
