import { handle, jsonResponse } from "@/core/http/response";
import { researchRunBody } from "@/app/api/v1/_contracts/requests-content"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session";
import { requireCapability } from "@/core/rbac/capabilities";
import { triggerResearchRun } from "@/modules/market-intelligence/use-cases/trigger-research-run";
import { marketIntelligenceRepo } from "@/modules/market-intelligence/infra/market-intelligence-repository";

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request);
  // Gác quyền V1: market-intel.research.run
  requireCapability(ctx, "V1");

  const body = await request.json().catch(() => ({}));
  const parsed = researchRunBody.safeParse(body);
  const runType = parsed.success && parsed.data.run_type ? parsed.data.run_type : "MANUAL";
  const params = parsed.success
    ? {
        keyword: parsed.data.keyword,
        geo: parsed.data.geo,
        timeframe: parsed.data.timeframe,
        channel: parsed.data.channel,
      }
    : undefined;

  const result = await triggerResearchRun(runType, params);
  return jsonResponse(result, { status: 201 });
});

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request);
  // Gác quyền V1: market-intel.research.run
  requireCapability(ctx, "V1");

  const runs = await marketIntelligenceRepo.listResearchRuns(20);

  return jsonResponse({ items: runs });
});
