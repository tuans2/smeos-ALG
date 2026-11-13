import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getCatalogHearts } from "@/modules/greeting-card/use-cases/get-catalog-hearts"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/catalogs/[id]/hearts — xếp hạng mẫu theo tổng tim (link riêng + công khai). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.read },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await getCatalogHearts(ctx, id) })
  },
})

export const dynamic = "force-dynamic"
