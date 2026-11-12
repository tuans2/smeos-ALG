import { created } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { dataRequestBody } from "@/app/api/v1/_contracts/requests-crm"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { exportForCustomer } from "@/modules/crm/use-cases/data-subject-requests"

/** POST /api/v1/crm/customers/[id]/data-requests/export (R13) — khách yêu cầu xuất dữ liệu cá nhân (ADR-014 D-P5). */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R13" },
  body: dataRequestBody,
  handler: async ({ ctx, params, body }) => {
    const result = await exportForCustomer(ctx, params.id ?? "", body.note ?? null)
    await recordDataExport(ctx, "crm_customers", { scope: "data_subject_request" })
    return created(result)
  },
})
