/** POST /api/v1/platform/subscription-invoices/:id/mark-paid (`N19`) — `{ note }`, Console xác nhận đã thu (checklist ALG 10.7). */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { confirmInvoicePayment } from "@/modules/subscription/use-cases/manage-subscription"
import { markInvoicePaidBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    const { id } = params as { id: string }
    const parsed = markInvoicePaidBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await confirmInvoicePayment(pctx, id, parsed.data.note) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
