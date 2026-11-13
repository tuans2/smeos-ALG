import { jsonResponse } from "@/core/http/response"
import { loadCostingProfile } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `GET /costing/profile` (`L1`) — hồ sơ tính giá theo ngành của cửa hàng; `supported: false` khi ngành chưa hỗ trợ. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx }) => {
    const p = await loadCostingProfile(ctx)
    return jsonResponse({ data: { supported: p.spec !== null, industryKey: p.industryKey, spec: p.spec, config: p.config } })
  },
})
