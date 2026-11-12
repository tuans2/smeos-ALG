import { created } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { dataRequestBody } from "@/app/api/v1/_contracts/requests-crm"
import { eraseForCustomer } from "@/modules/crm/use-cases/data-subject-requests"

/** POST /api/v1/crm/customers/[id]/data-requests/erase (Q4) — khách yêu cầu xoá dữ liệu cá nhân (ADR-014 D-P5). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "Q4" },
  body: dataRequestBody,
  handler: async ({ ctx, params, body }) => created(await eraseForCustomer(ctx, params.id ?? "", body.note ?? null)),
})
