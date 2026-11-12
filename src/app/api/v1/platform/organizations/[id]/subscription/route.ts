/**
 * GET/PUT/DELETE /api/v1/platform/organizations/:id/subscription — gói thuê bao của tổ chức (checklist ALG 10.7).
 * GET (`N1`). PUT (`N19`): `{ plan, cycle, priceVnd, includedCreditsMonthly, firstPeriodPaid? }`. DELETE (`N19`): huỷ.
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { assignSubscription, cancelSubscription, getOrganizationSubscription } from "@/modules/subscription/use-cases/manage-subscription"
import { assignSubscriptionBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    return jsonResponse({ data: await getOrganizationSubscription(pctx, id) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    const parsed = assignSubscriptionBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await assignSubscription(pctx, id, parsed.data) })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    await cancelSubscription(pctx, id)
    return jsonResponse({ data: { cancelled: true } })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
