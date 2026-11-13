/**
 * GET /api/v1/platform/organizations/:id/custom-domains (`N1`) — tên miền riêng của một tổ chức (checklist ALG 10.8).
 */
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { listOrganizationCustomDomains } from "@/modules/custom-domain/use-cases/platform-custom-domains"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    return jsonResponse({ data: await listOrganizationCustomDomains(pctx, id) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
