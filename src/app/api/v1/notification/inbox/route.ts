import { MAX_PAGE_LIMIT, parseIntParam } from "@/core/http/pagination"
import { jsonResponse } from "@/core/http/response"
import { listUserInbox } from "@/modules/notification/use-cases/manage-inbox"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "hộp thư thông báo của chính mình (lọc user_id + organization_id của phiên)" },
  handler: async ({ request, ctx, resolved }) => {
    const url = new URL(request.url)
    const page = parseIntParam(url.searchParams.get("page"), { field: "page", fallback: 1, min: 1, max: 100_000 })
    const limit = parseIntParam(url.searchParams.get("limit"), { field: "limit", fallback: 20, min: 1, max: MAX_PAGE_LIMIT })
    const unreadOnly = url.searchParams.get("unread_only") === "true"

    const result = await listUserInbox(resolved.user.id, ctx.organizationId, {
      page,
      limit,
      unreadOnly,
    })

    return jsonResponse({
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        unreadCount: result.unreadCount,
      },
    })
  },
})
