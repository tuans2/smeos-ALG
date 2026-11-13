import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { withoutSunsetFields } from "@/modules/integration/domain/integration-field-sunset"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { recordExternalUsage } from "@/modules/usage/use-cases/record-external-usage"
import { recordUsageBody } from "@/modules/integration/contracts/http-requests"
import { defineRoute } from "@/core/http/define-route"

/** `POST /integration/usage` (đặc tả 06 mục 11): "Ghi mức dùng phát sinh ở engine ngoài". */
export const POST = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const ctx = await toTenantContext(ic)

    const parsed = recordUsageBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const row = await recordExternalUsage(ctx, {
      feature: parsed.data.feature,
      quantity: parsed.data.quantity,
      costUsd: parsed.data.cost_usd,
      status: parsed.data.status,
      jobId: parsed.data.job_id,
    })

    // Trường nội bộ tự bỏ từ 09/02/2027 (ARC-024, `integration-field-sunset.ts`)
    return jsonResponse(withoutSunsetFields("usage", row, new Date()), { status: 201 })
  },
})
