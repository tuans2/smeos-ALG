/**
 * GET/POST /api/v1/platform/organizations/:id/credits — sổ cái credit của một tổ chức (checklist ALG 10.6).
 * GET (`N1`): số dư và các dòng gần nhất. POST (`N3`): `{ kind: TOPUP|GIFT|REFUND, amount, reason }`.
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { adjustOrganizationCredits, listOrganizationCredits } from "@/modules/platform/use-cases/manage-credits"
import { adjustCreditsBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    return jsonResponse({ data: await listOrganizationCredits(pctx, id) })
  },
})

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    const parsed = adjustCreditsBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await adjustOrganizationCredits(pctx, { organizationId: id, ...parsed.data }) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
