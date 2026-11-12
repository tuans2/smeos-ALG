import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { dataRequestsQuery } from "@/app/api/v1/_contracts/requests-crm"
import { listDataSubjectRequests } from "@/modules/crm/use-cases/data-subject-requests"

/** GET /api/v1/crm/data-requests (Q1) — yêu cầu của khách về dữ liệu cá nhân, mới nhất trước (ADR-014 D-P5). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  query: dataRequestsQuery,
  handler: async ({ ctx, query }) =>
    ok(await listDataSubjectRequests(ctx, { ...(query.status ? { status: query.status } : {}), ...(query.customer_id ? { customerId: query.customer_id } : {}) })),
})
