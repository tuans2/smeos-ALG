/**
 * POST /api/v1/crm/customers/[id]/occasions
 * Thêm dịp kỷ niệm mới cho khách hàng.
 * Quyền: Q6 (RS-10 18/09 — trước đó ghi nhầm Q5, đã đổi nghĩa mã cho khớp đặc tả).
 */

import { jsonResponse } from "@/core/http/response"
import { addCustomerOccasion } from "@/modules/crm/use-cases/add-customer-occasion"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "Q6" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const occasion = await addCustomerOccasion(ctx, id, {
      name: body.name,
      date: body.date,
      isRecurring: body.isRecurring,
      reminderDaysBefore: body.reminderDaysBefore,
      recipientName: body.recipientName,
      notes: body.notes,
    })

    return jsonResponse({ occasion }, { status: 201 })
  },
})
