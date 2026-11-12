/** GET /api/v1/integrations — tổng quan, danh mục theo tầng/gói và kết nối của tổ chức (W1). */

import { jsonResponse } from "@/core/http/response"
import { getIntegrationHub } from "@/modules/integration-hub/use-cases/get-integration-hub"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getIntegrationHub" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getIntegrationHub(ctx))
  },
})
