import { jsonResponse } from "@/core/http/response"
import { getCoordinatorWork } from "@/modules/greeting-card/use-cases/coordinator-work"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/coordinator-work — bước, kẹt và thời gian chuẩn của từng đơn (bảng Điều phối). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getCoordinatorWork(ctx) })
  },
})

export const dynamic = "force-dynamic"
