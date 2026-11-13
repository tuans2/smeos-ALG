/** GET /api/v1/integrations/connections/:id/events?status=&limit= — nhật ký sự kiện (W1, tối đa 100). */

import { jsonResponse } from "@/core/http/response"
import { connectionEventsQuery } from "@/app/api/v1/_contracts/requests-integrations"
import { validationFailed } from "@/core/http/errors"
import { listConnectionEvents } from "@/modules/integration-hub/use-cases/connection-events"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: listConnectionEvents" },
  handler: async ({ request: req, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = connectionEventsQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams))
    if (!parsed.success) throw validationFailed({ query: "Tham số lọc không hợp lệ" })
    const events = await listConnectionEvents(ctx, {
      connectionId: id,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.limit ? { limit: parsed.data.limit } : {}),
    })
    return jsonResponse({ events })
  },
})
