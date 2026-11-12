import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { resolveDataRequestBody } from "@/app/api/v1/_contracts/requests-crm"
import { resolveDataSubjectRequest } from "@/modules/crm/use-cases/data-subject-requests"

/** PATCH /api/v1/crm/data-requests/[id] (Q3) — đóng yêu cầu đang chờ: hoàn tất hoặc từ chối (ADR-014 D-P5). */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "Q3" },
  body: resolveDataRequestBody,
  handler: async ({ ctx, params, body }) => ok(await resolveDataSubjectRequest(ctx, params.id ?? "", { status: body.status, note: body.note ?? null })),
})
