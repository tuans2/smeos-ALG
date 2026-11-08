/**
 * GET /api/v1/platform/organizations/:id/custom-domains (`N1`) — tên miền riêng của một tổ chức (checklist ALG 10.8).
 */
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { listOrganizationCustomDomains } from "@/modules/custom-domain/use-cases/platform-custom-domains"

type Ctx = { params: Promise<{ id: string }> }

export const GET = handle(async (request, context: Ctx) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  return jsonResponse({ data: await listOrganizationCustomDomains(pctx, id) })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
