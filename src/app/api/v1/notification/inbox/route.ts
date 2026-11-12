import { MAX_PAGE_LIMIT, parseIntParam } from "@/core/http/pagination"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listUserInbox } from "@/modules/notification/use-cases/manage-inbox"

export const GET = handle(async (request) => {
  const { ctx, resolved } = await requireTenantContext(request)
  const url = new URL(request.url)
  const page = parseIntParam(url.searchParams.get("page"), { field: "page", fallback: 1, min: 1, max: 100_000 })
  const limit = parseIntParam(url.searchParams.get("limit"), { field: "limit", fallback: 20, min: 1, max: MAX_PAGE_LIMIT })
  const unreadOnly = url.searchParams.get("unreadOnly") === "true"

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
})
