/**
 * GET/PUT /api/v1/platform/credit-pricing — quy đổi credit cấp nền tảng (PO Q10, checklist ALG 10.3, 10.4).
 * GET (`N4`). PUT (`N3`): `{ smsCredit?, znsCredit?, usdToVnd?, creditValueVnd?, defaultMonthlyLimit?, messageOverdraftCredit?, brandExtraOptionCredit? }`.
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getCreditPricing, updateCreditPricing } from "@/modules/platform/use-cases/credit-pricing"
import { creditPricingBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await getCreditPricing(pctx) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const parsed = creditPricingBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
    return jsonResponse({ data: await updateCreditPricing(pctx, input) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
