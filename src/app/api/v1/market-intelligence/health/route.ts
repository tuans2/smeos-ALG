import { jsonResponse } from "@/core/http/response"
import { marketIntelligenceRepo } from "@/modules/market-intelligence/infra/market-intelligence-repository"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  // Gác quyền V1: market-intel.research.run
  auth: { kind: "tenant", capability: "V1" },
  handler: async ({ ctx }) => {
    const healthRecords = await marketIntelligenceRepo.getAllProviderHealth();

    return jsonResponse({ providers: healthRecords });
  },
});
