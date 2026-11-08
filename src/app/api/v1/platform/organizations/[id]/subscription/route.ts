/**
 * GET/PUT/DELETE /api/v1/platform/organizations/:id/subscription — gói thuê bao của tổ chức (checklist ALG 10.7).
 * GET (`N1`). PUT (`N19`): `{ plan, cycle, priceVnd, includedCreditsMonthly, firstPeriodPaid? }`. DELETE (`N19`): huỷ.
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { assignSubscription, cancelSubscription, getOrganizationSubscription } from "@/modules/subscription/use-cases/manage-subscription"
import { assignSubscriptionBody } from "@/app/api/v1/platform/_contracts/requests"

type Ctx = { params: Promise<{ id: string }> }

export const GET = handle(async (request, context: Ctx) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  return jsonResponse({ data: await getOrganizationSubscription(pctx, id) })
})

export const PUT = handle(async (request, context: Ctx) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  const parsed = assignSubscriptionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await assignSubscription(pctx, id, parsed.data) })
})

export const DELETE = handle(async (request, context: Ctx) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  await cancelSubscription(pctx, id)
  return jsonResponse({ data: { cancelled: true } })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
