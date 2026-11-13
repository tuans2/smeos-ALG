import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getInbox } from "@/modules/greeting-card/use-cases/get-inbox"

import type { MessageRole } from "@/modules/greeting-card/domain/internal-message"
import { defineRoute } from "@/core/http/define-route"

/** GET /api/v1/greeting-card/inbox — Hộp việc của người đang đăng nhập (việc cần làm, tin nhắn, cập nhật). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.orderRead },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const roleParam = url.searchParams.get("role")
    const role = roleParam === "ADMIN" || roleParam === "SALE" || roleParam === "COORDINATOR" ? (roleParam as MessageRole) : undefined
    return jsonResponse({ data: await getInbox(ctx, role) })
  },
})

export const dynamic = "force-dynamic"
