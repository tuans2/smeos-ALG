/**
 * GET /api/v1/crm/reminders/upcoming
 * Quét các dịp kỷ niệm sắp tới của khách hàng (AI Reminder Scan).
 * Quyền: Q7
 */

import { jsonResponse } from "@/core/http/response"
import { scanUpcomingReminders } from "@/modules/crm/use-cases/scan-upcoming-reminders"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q7" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const daysAhead = url.searchParams.get("days") ? Number(url.searchParams.get("days")) : 14

    const result = await scanUpcomingReminders(ctx, Number.isNaN(daysAhead) ? 14 : daysAhead)
    return jsonResponse(result)
  },
})
