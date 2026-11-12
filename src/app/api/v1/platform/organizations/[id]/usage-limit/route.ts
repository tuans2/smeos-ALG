/** PUT /api/v1/platform/organizations/:id/usage-limit (`N3`) — `{ monthlyLimit: number | null }`, checklist ALG 10.3. */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { setOrganizationMonthlyLimit } from "@/modules/platform/use-cases/manage-credits"
import { usageLimitBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    const parsed = usageLimitBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await setOrganizationMonthlyLimit(pctx, id, parsed.data.monthlyLimit) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
