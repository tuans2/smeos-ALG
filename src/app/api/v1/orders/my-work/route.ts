/**
 * `GET /api/v1/orders/my-work` (R17) — việc chế tác đang giao cho người đăng nhập, sắp theo giờ giao.
 * `?scope=team` (R4) — mọi việc đang giao trong phạm vi chi nhánh của người phân công.
 */

import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { listFloristQueue } from "@/modules/orders/use-cases/florist-queue"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: R4 (scope=team) hoặc R17 (việc của mình)" },
  handler: async ({ request, ctx }) => {
    const scope = new URL(request.url).searchParams.get("scope") === "team" ? "team" : "mine"
    requireCapability(ctx, scope === "team" ? "R4" : "R17")
    return jsonResponse({ data: await listFloristQueue(ctx, scope) })
  },
})

export const dynamic = "force-dynamic"
