import { parseIntParam } from "@/core/http/pagination"
import { jsonResponse } from "@/core/http/response"
import { listTenantOpportunities } from "@/modules/market-intelligence/use-cases/list-tenant-opportunities"
import type { MarketTimeframeKey } from "@/modules/market-intelligence/domain/trend-timeframe"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "V2" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url);
    // Chữ → `NaN` xuống Prisma → 500 trước đây (audit API §22); trần 100 giữ đúng trần của use-case
    const limit = parseIntParam(url.searchParams.get("limit"), { field: "limit", fallback: 20, min: 1, max: 100 });
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const minScore = url.searchParams.get("min_score")
      ? parseFloat(url.searchParams.get("min_score")!)
      : undefined;
    const timeframe = (url.searchParams.get("timeframe") as MarketTimeframeKey | null) ?? undefined;

    const result = await listTenantOpportunities({
      organizationId: ctx.organizationId,
      limit,
      cursor,
      minScore,
      timeframe,
    });

    return jsonResponse(result);
  },
});
