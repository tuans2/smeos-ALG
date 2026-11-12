/**
 * GET/PUT /api/v1/usage/limits — hạn mức credit tháng của cửa hàng (checklist ALG 10.3, 9.7).
 * GET (`G8`): kỳ hiện tại, credit đã dùng/hạn mức, phần AI. PUT (`U2`): `{ aiMonthlyLimit: number | null }`.
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { aiMonthlyLimitBody } from "@/app/api/v1/_contracts/requests-misc"
import { getMonthlyLimits, setAiMonthlyLimit } from "@/modules/usage/use-cases/monthly-limits"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getMonthlyLimits" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getMonthlyLimits(ctx) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: setAiMonthlyLimit" },
  handler: async ({ request, ctx }) => {
    const parsed = aiMonthlyLimitBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await setAiMonthlyLimit(ctx, parsed.data.aiMonthlyLimit) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
