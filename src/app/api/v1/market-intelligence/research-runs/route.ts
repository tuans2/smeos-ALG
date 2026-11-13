import { jsonResponse } from "@/core/http/response"
import { researchRunBody } from "@/app/api/v1/_contracts/requests-content"
import { triggerResearchRun } from "@/modules/market-intelligence/use-cases/trigger-research-run"
import { marketIntelligenceRepo } from "@/modules/market-intelligence/infra/market-intelligence-repository"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  // Gác quyền V1: market-intel.research.run
  auth: { kind: "tenant", capability: "V1" },
  handler: async ({ request, ctx }) => {
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
  },
});

export const GET = defineRoute({
  // Gác quyền V1: market-intel.research.run
  auth: { kind: "tenant", capability: "V1" },
  handler: async ({ ctx }) => {
    const runs = await marketIntelligenceRepo.listResearchRuns(20);

    return jsonResponse({ items: runs });
  },
});
