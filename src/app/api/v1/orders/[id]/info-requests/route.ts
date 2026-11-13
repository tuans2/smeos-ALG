/**
 * `GET /api/v1/orders/:id/info-requests` (R1) — yêu cầu bổ sung thông tin của đơn (đồng bộ trường thiếu trước khi trả).
 * `POST` (R3) — tạo yêu cầu tay: trường thiếu, hỏi ai, hạn (checklist ALG 4.14).
 */

import { jsonResponse } from "@/core/http/response"
import { createOrderInfoRequest, syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { createInfoRequestBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await syncOrderInfoRequests(ctx, id) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = camelKeys(createInfoRequestBody.parse(await request.json()))
    const created = await createOrderInfoRequest(ctx, id, { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : null, channel: body.channel ?? null })
    return jsonResponse({ data: created }, { status: 201 })
  },
})

export const dynamic = "force-dynamic"
