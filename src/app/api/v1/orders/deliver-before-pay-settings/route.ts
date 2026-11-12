/**
 * Hạn mức "giao trước, thu sau" Sale tự quyết. GET — R1 · PUT — F2 (sửa cài đặt tổ chức, trần cứng Điều hành).
 * Body PUT `{ allowSelfDecide?, selfDecideMaxVnd?, minCompletedOrders?, collectDueDays? }`.
 */

import { jsonResponse } from "@/core/http/response"
import { getDeliverBeforePaySettings, updateDeliverBeforePaySettings } from "@/modules/orders/use-cases/deliver-before-pay-settings"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getDeliverBeforePaySettings(ctx))
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body: unknown = await request.json().catch(() => null)
    return jsonResponse(await updateDeliverBeforePaySettings(ctx, body ?? {}))
  },
})

export const dynamic = "force-dynamic"
