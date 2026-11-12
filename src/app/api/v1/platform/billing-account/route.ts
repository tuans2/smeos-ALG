/** GET (`N1`) / PUT (`N19`) /api/v1/platform/billing-account — tài khoản nhận tiền thuê bao của nền tảng (checklist ALG 10.7). */
import { jsonResponse } from "@/core/http/response"
import { getBillingAccount, setBillingAccount } from "@/modules/subscription/use-cases/manage-subscription"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await getBillingAccount(pctx) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    return jsonResponse({ data: await setBillingAccount(pctx, await request.json().catch(() => null)) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
