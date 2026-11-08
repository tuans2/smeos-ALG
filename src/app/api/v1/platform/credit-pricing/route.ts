/**
 * GET/PUT /api/v1/platform/credit-pricing — quy đổi credit cấp nền tảng (PO Q10, checklist ALG 10.3, 10.4).
 * GET (`N4`). PUT (`N3`): `{ smsCredit?, znsCredit?, usdToVnd?, creditValueVnd?, defaultMonthlyLimit?, messageOverdraftCredit? }`.
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { getCreditPricing, updateCreditPricing } from "@/modules/platform/use-cases/credit-pricing"
import { creditPricingBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  return jsonResponse({ data: await getCreditPricing(pctx) })
})

export const PUT = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  const parsed = creditPricingBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const input = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined))
  return jsonResponse({ data: await updateCreditPricing(pctx, input) })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
