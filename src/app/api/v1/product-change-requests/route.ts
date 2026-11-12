import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listChangeRequests } from "@/modules/products/use-cases/product-change-requests"
import { defineRoute } from "@/core/http/define-route"

const STATUSES = ["PENDING", "APPROVED", "PARTIAL", "REJECTED", "EXPIRED"] as const

/** `GET /product-change-requests?status=PENDING` (`H3`) — hàng chờ duyệt đề xuất sửa của cả tổ chức. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H3" },
  handler: async ({ request, ctx }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "PENDING"
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw validationFailed({ status: `Phải là một trong: ${STATUSES.join(", ")}` })
    return jsonResponse({ data: await listChangeRequests(ctx, { status }) })
  },
})
