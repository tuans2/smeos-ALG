import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { suggestCraftFee } from "@/modules/greeting-card/use-cases/suggest-craft-fee"
import { defineRoute } from "@/core/http/define-route"

type RouteCtx = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/greeting-card/orders/[id]/craft-fee
 * Phí gia công gợi ý cho đơn theo phương án tiệm đã cài, kèm diễn giải — thay cho "50% giá bán"
 * từng tính sẵn ở giao diện (PO 22/10/2026).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.assignFlorist },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const s = await suggestCraftFee(ctx.organizationId, id, new CraftFeeFactsRepository())
    return jsonResponse({
      data: { feeLabel: s.feeLabel, suggestedVnd: s.suggestedVnd, lines: s.lines, adjustPercent: s.adjustPercent },
    })
  },
})

export const dynamic = "force-dynamic"
