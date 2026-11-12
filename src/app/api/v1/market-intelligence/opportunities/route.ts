import { parseIntParam } from "@/core/http/pagination";
import { handle, jsonResponse } from "@/core/http/response";
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session";
import { requireCapability } from "@/core/rbac/capabilities";
import { listTenantOpportunities } from "@/modules/market-intelligence/use-cases/list-tenant-opportunities";
import type { MarketTimeframeKey } from "@/modules/market-intelligence/domain/trend-timeframe";

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request);
  // Gác quyền V2: market-intel.opportunity.read
  requireCapability(ctx, "V2");

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
});
