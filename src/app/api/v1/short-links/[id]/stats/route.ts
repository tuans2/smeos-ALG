/**
 * GET /api/v1/short-links/[id]/stats?days=30 — lượt quét theo ngày, thiết bị, khách riêng, số lead.
 * J1: Tạo catalog.
 */

import { jsonResponse } from "@/core/http/response"
import { getShortLinkStats } from "@/modules/acquisition/use-cases/manage-short-links"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "J1" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const days = Number(new URL(request.url).searchParams.get("days") ?? "30")
    return jsonResponse(await getShortLinkStats(ctx, id, days))
  },
})
