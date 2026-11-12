/**
 * GET /api/v1/orders/lead-queue — hàng đợi "Khách tiềm năng" chung cho Sale (lead nguồn mới + phiên Thẻ
 * chào chưa đặt). Q1: xem thông tin khách hàng (cùng mã với `/api/v1/leads`).
 */

import { jsonResponse } from "@/core/http/response"
import { listLeadQueue } from "@/modules/orders/use-cases/list-lead-queue"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await listLeadQueue(ctx))
  },
})

export const dynamic = "force-dynamic"
