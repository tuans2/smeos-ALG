/**
 * `GET /api/v1/orders/:id/info-requests` (R1) — yêu cầu bổ sung thông tin của đơn (đồng bộ trường thiếu trước khi trả).
 * `POST` (R3) — tạo yêu cầu tay: trường thiếu, hỏi ai, hạn (checklist ALG 4.14).
 */

import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { createOrderInfoRequest, syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createInfoRequestBody } from "@/app/api/v1/_contracts/requests-orders"

export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R1")
  const { id } = await context.params
  return jsonResponse({ data: await syncOrderInfoRequests(ctx, id) })
})

export const POST = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R3")
  const { id } = await context.params
  const body = createInfoRequestBody.parse(await request.json())
  const created = await createOrderInfoRequest(ctx, id, { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : null, channel: body.channel ?? null })
  return jsonResponse({ data: created }, { status: 201 })
})

export const dynamic = "force-dynamic"
